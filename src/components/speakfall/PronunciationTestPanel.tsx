import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Mic, Square, Volume2 } from "lucide-react";
import type { TrackType, WordItem } from "@/data/words";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { TRACKS, WORLD_TRACKS } from "@/lib/speakfall/tracks";
import {
  evaluatePronunciation,
  type PronunciationReason,
} from "@/lib/speech/pronunciationEvaluator";
import {
  countPronunciationTestResults,
  getPronunciationTestWords,
  loadPronunciationTestResults,
  paginatePronunciationTestWords,
  PRONUNCIATION_TEST_PAGE_SIZES,
  pronunciationTestResultKey,
  savePronunciationTestResults,
  upsertPronunciationTestResult,
  type PronunciationTestPageSize,
} from "@/lib/speech/pronunciationTest";
import type { SpeechResult } from "@/lib/speech/types";

const TEST_TRACKS: TrackType[] = ["basic", ...WORLD_TRACKS];

const REASON_LABELS: Record<PronunciationReason, string> = {
  "top-exact": "Exact",
  "alternative-exact": "Alt Exact",
  "top-homophone": "Homo",
  "alternative-homophone": "Alt Homo",
  "top-natural-alias": "Alias",
  "alternative-natural-alias": "Alt Alias",
  similar: "Similar",
  "minimal-pair-conflict": "Pair",
  "no-match": "Fail",
};

type Props = {
  initialTrack: TrackType;
  onBack: () => void;
};

export function PronunciationTestPanel({ initialTrack, onBack }: Props) {
  const [track, setTrack] = useState<TrackType>(initialTrack);
  const [level, setLevel] = useState(1);
  const [pageSize, setPageSize] = useState<PronunciationTestPageSize>(25);
  const [page, setPage] = useState(1);
  const [activeWord, setActiveWord] = useState<WordItem | null>(null);
  const [results, setResults] = useState(loadPronunciationTestResults);
  const activeWordRef = useRef<WordItem | null>(null);
  activeWordRef.current = activeWord;

  const handleResult = useCallback(
    (speechResult: SpeechResult) => {
      const target = activeWordRef.current;
      if (!target || !speechResult.transcript.trim()) return;
      const natural = evaluatePronunciation({
        target,
        result: speechResult,
        strictness: "easy",
        trackLeniency: TRACKS[track].leniency,
      });
      const precise = evaluatePronunciation({
        target,
        result: speechResult,
        strictness: "hard",
        trackLeniency: TRACKS[track].leniency,
      });
      setResults((current) => {
        const next = upsertPronunciationTestResult(current, {
          track,
          level,
          word: target.word,
          transcript: speechResult.transcript.trim(),
          alternatives: speechResult.alternatives.map(({ transcript }) => transcript),
          natural: { accepted: natural.accepted, reason: natural.reason },
          precise: { accepted: precise.accepted, reason: precise.reason },
          testedAt: Date.now(),
        });
        savePronunciationTestResults(next);
        return next;
      });
    },
    [level, track],
  );
  const speech = useSpeechRecognition(handleResult);
  const speechRef = useRef(speech);
  speechRef.current = speech;

  const words = useMemo(() => getPronunciationTestWords(track, level), [level, track]);
  const pageData = useMemo(
    () => paginatePronunciationTestWords(words, page, pageSize),
    [page, pageSize, words],
  );
  const completed = countPronunciationTestResults(results, track, level);

  useEffect(() => {
    setPage((current) => Math.min(current, pageData.pageCount));
  }, [pageData.pageCount]);

  useEffect(
    () => () => {
      speechRef.current.stop();
    },
    [],
  );

  const resetSelection = () => {
    speech.stop();
    speech.reset();
    setActiveWord(null);
    setPage(1);
  };

  const toggleWordTest = (word: WordItem) => {
    if (speech.listening && activeWord?.word === word.word) {
      speech.stop();
      setActiveWord(null);
      return;
    }
    speech.stop();
    speech.reset();
    setActiveWord(word);
    window.setTimeout(() => speech.start(), 120);
  };

  const playWord = async (word: string) => {
    const restart = speech.listening;
    speech.stop();
    try {
      const isNative = !!(
        window as typeof window & { Capacitor?: { isNativePlatform?: () => boolean } }
      ).Capacitor?.isNativePlatform?.();
      if (isNative) {
        const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
        await TextToSpeech.stop();
        await TextToSpeech.speak({ text: word, lang: "en-US", rate: 0.82, pitch: 1, volume: 1 });
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = "en-US";
        utterance.rate = 0.82;
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }
    } finally {
      if (restart) window.setTimeout(() => speech.start(), 250);
    }
  };

  const verdict = (accepted: boolean, reason: PronunciationReason) => (
    <span className={`font-bold ${accepted ? "text-emerald-600" : "text-rose-500"}`}>
      {accepted ? "✅" : "❌"} {REASON_LABELS[reason]}
    </span>
  );

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-sky-start px-4 pb-10 pt-6 text-[#173f78]">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            speech.stop();
            onBack();
          }}
          className="grid size-11 place-items-center rounded-full bg-white/90 shadow-soft"
          aria-label="구조 지도로 돌아가기"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-2xl">단어 발음 테스트</h1>
        <span className="w-11" />
      </header>

      <section className="mx-auto mt-5 max-w-5xl rounded-3xl bg-white/90 p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="font-ui text-xs font-bold text-[#47658d]">
            스테이지
            <select
              value={track}
              onChange={(event) => {
                setTrack(event.target.value as TrackType);
                resetSelection();
              }}
              className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 font-bold text-[#173f78]"
            >
              {TEST_TRACKS.map((id) => (
                <option key={id} value={id}>
                  {TRACKS[id].name}
                </option>
              ))}
            </select>
          </label>
          <label className="font-ui text-xs font-bold text-[#47658d]">
            레벨
            <select
              value={level}
              onChange={(event) => {
                setLevel(Number(event.target.value));
                resetSelection();
              }}
              className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 font-bold text-[#173f78]"
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  Level {value}
                </option>
              ))}
            </select>
          </label>
          <label className="font-ui text-xs font-bold text-[#47658d]">
            페이지당
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as PronunciationTestPageSize);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 font-bold text-[#173f78]"
            >
              {PRONUNCIATION_TEST_PAGE_SIZES.map((value) => (
                <option key={value} value={value}>
                  {value}개
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-center font-ui text-sm font-bold text-[#47658d]">
          총 {pageData.total}개 | 테스트 완료 {completed}개 | {pageData.start}–{pageData.end} /{" "}
          {pageData.total}
        </p>
        <p className="mt-1 text-center font-ui text-xs text-[#6784a8]">
          {speech.error ?? `현재 엔진: ${speech.engine}`}
        </p>
      </section>

      <section className="mx-auto mt-4 max-w-5xl overflow-hidden rounded-3xl bg-white/95 shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left font-ui text-xs">
            <thead className="bg-[#dff2ff] text-[#315e91]">
              <tr>
                {[
                  "스테이지",
                  "레벨",
                  "순서",
                  "단어",
                  "발음 체크",
                  "자연스럽게",
                  "정확하게",
                  "발음하기",
                ].map((label) => (
                  <th key={label} className="whitespace-nowrap px-3 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.items.map(({ word, order }) => {
                const key = pronunciationTestResultKey(track, level, word.word);
                const saved = results[key];
                const active = activeWord?.word === word.word && speech.listening;
                return (
                  <tr key={word.word} className="border-t border-sky-100 even:bg-sky-50/50">
                    <td className="px-3 py-3">{TRACKS[track].name}</td>
                    <td className="px-3 py-3">{level}</td>
                    <td className="px-3 py-3 tabular-nums">{order}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => void playWord(word.word)}
                        className="flex items-center gap-1.5 font-bold text-[#173f78]"
                      >
                        {word.word} <Volume2 className="size-4 text-sky-500" />
                      </button>
                      <span className="text-[10px] text-[#7890aa]">{word.ipa}</span>
                    </td>
                    <td className="max-w-44 px-3 py-3">
                      <p className="break-words font-bold">{saved?.transcript ?? "—"}</p>
                      {saved?.alternatives.length ? (
                        <p className="mt-1 break-words text-[10px] text-[#7890aa]">
                          Alt: {saved.alternatives.join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {saved ? verdict(saved.natural.accepted, saved.natural.reason) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {saved ? verdict(saved.precise.accepted, saved.precise.reason) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        disabled={!speech.supported}
                        onClick={() => toggleWordTest(word)}
                        className={`inline-grid size-10 place-items-center rounded-full text-white disabled:opacity-40 ${active ? "bg-rose-500" : "bg-[#3d8ef0]"}`}
                        aria-label={`${word.word} 발음 테스트`}
                      >
                        {active ? (
                          <Square className="size-4 fill-current" />
                        ) : (
                          <Mic className="size-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <nav
        className="mx-auto mt-5 flex max-w-5xl items-center justify-center gap-2"
        aria-label="발음 테스트 페이지 이동"
      >
        <button
          type="button"
          disabled={pageData.page <= 1}
          onClick={() => setPage((value) => value - 1)}
          className="flex items-center gap-1 rounded-full bg-white px-4 py-2 font-bold disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> 이전
        </button>
        {Array.from({ length: pageData.pageCount }, (_, index) => index + 1).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPage(value)}
            className={`grid size-9 place-items-center rounded-full font-bold ${pageData.page === value ? "bg-[#3d8ef0] text-white" : "bg-white"}`}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          disabled={pageData.page >= pageData.pageCount}
          onClick={() => setPage((value) => value + 1)}
          className="flex items-center gap-1 rounded-full bg-white px-4 py-2 font-bold disabled:opacity-40"
        >
          다음 <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
