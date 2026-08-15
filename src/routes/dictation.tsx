import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clipboard, Mic, MicOff, RotateCcw, Trash2 } from "lucide-react";

import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const title = "English Dictation Test — SpeakFall";
const description = "영어로 말한 내용을 실시간으로 받아쓰는 음성 인식 테스트 페이지입니다.";

export const Route = createFileRoute("/dictation")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DictationPage,
});

type DictationEntry = {
  id: number;
  text: string;
  alternatives: string[];
};

function DictationPage() {
  const [current, setCurrent] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [entries, setEntries] = useState<DictationEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const commitTimerRef = useRef<number | null>(null);
  const latestRef = useRef({ text: "", alternatives: [] as string[] });

  const commitCurrent = useCallback((text: string, candidates: string[]) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setEntries((previous) => {
      if (previous.at(-1)?.text.toLowerCase() === cleaned.toLowerCase()) return previous;
      return [
        ...previous,
        {
          id: Date.now(),
          text: cleaned,
          alternatives: candidates.filter((candidate) => candidate !== cleaned).slice(0, 4),
        },
      ];
    });
  }, []);

  const handleResult = useCallback(
    ({
      transcript,
      alternatives: candidates,
      isFinal,
    }: {
      transcript: string;
      alternatives: string[];
      isFinal: boolean;
    }) => {
      const text = transcript.trim();
      if (!text) return;
      latestRef.current = { text, alternatives: candidates };
      setCurrent(text);
      setAlternatives(candidates.filter((candidate) => candidate !== text).slice(0, 4));

      if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
      if (isFinal) {
        commitCurrent(text, candidates);
        return;
      }
      commitTimerRef.current = window.setTimeout(() => {
        commitTimerRef.current = null;
        commitCurrent(latestRef.current.text, latestRef.current.alternatives);
      }, 1000);
    },
    [commitCurrent],
  );

  const speech = useSpeechRecognition(handleResult);
  const speechRef = useRef(speech);
  speechRef.current = speech;

  useEffect(
    () => () => {
      if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
      speechRef.current.stop();
    },
    [],
  );

  const clearAll = () => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    latestRef.current = { text: "", alternatives: [] };
    setCurrent("");
    setAlternatives([]);
    setEntries([]);
    speech.reset();
  };

  const copyDictation = async () => {
    const text = entries.map((entry) => entry.text).join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-sky-100 via-cyan-50 to-amber-50 text-[#173f78]">
      <div
        className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-5 py-8"
        style={{
          paddingTop: "calc(2rem + env(safe-area-inset-top))",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="rounded-full bg-white/90 px-4 py-2 text-sm font-bold shadow-sm"
          >
            ← 홈
          </Link>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              speech.listening
                ? "bg-red-100 text-red-600"
                : "bg-white/80 text-slate-500"
            }`}
          >
            {speech.listening ? "● 인식 중" : "인식 대기"}
          </span>
        </div>

        <header className="mt-7">
          <p className="text-sm font-bold text-sky-600">SpeakFall Test Lab</p>
          <h1 className="mt-1 font-display text-3xl text-[#173f78]">영어 말하기 받아쓰기</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            마이크를 시작하고 영어로 말해보세요. 인식 결과는 실시간으로 표시되고,
            약 1초 동안 말이 멈추면 아래 기록에 추가됩니다.
          </p>
        </header>

        <section className="mt-6 rounded-3xl bg-white/95 p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <span
              className={`relative grid size-14 shrink-0 place-items-center rounded-full ${
                speech.listening ? "bg-red-100 text-red-500" : "bg-sky-100 text-sky-500"
              }`}
            >
              {speech.listening && (
                <span className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/60" />
              )}
              <Mic className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Live transcript
              </p>
              <p className="mt-1 min-h-8 break-words text-xl font-bold text-[#173f78]">
                {current || "Say something in English…"}
              </p>
            </div>
          </div>

          {alternatives.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-400">다른 인식 후보</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alternatives.map((candidate) => (
                  <span
                    key={candidate}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                  >
                    {candidate}
                  </span>
                ))}
              </div>
            </div>
          )}

          {speech.error && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {speech.error}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              disabled={!speech.supported}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-lg text-white shadow-sm active:scale-[0.98] disabled:opacity-40 ${
                speech.listening ? "bg-slate-600" : "bg-[#3d8ef0]"
              }`}
            >
              {speech.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              {speech.listening ? "인식 중지" : "마이크 시작"}
            </button>
            <button
              type="button"
              onClick={() => speech.reset()}
              disabled={!speech.listening}
              className="flex items-center justify-center gap-2 rounded-2xl bg-sky-100 py-3.5 font-display text-lg text-sky-700 active:scale-[0.98] disabled:opacity-40"
            >
              <RotateCcw className="size-5" />
              세션 재시작
            </button>
          </div>
        </section>

        <section className="mt-5 flex-1 rounded-3xl bg-white/90 p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">받아쓰기 기록</h2>
              <p className="text-xs text-slate-400">총 {entries.length}개 문장</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copyDictation()}
                disabled={entries.length === 0}
                className="grid size-10 place-items-center rounded-full bg-sky-100 text-sky-600 disabled:opacity-40"
                aria-label="받아쓰기 기록 복사"
              >
                <Clipboard className="size-4" />
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={entries.length === 0 && !current}
                className="grid size-10 place-items-center rounded-full bg-red-50 text-red-500 disabled:opacity-40"
                aria-label="받아쓰기 기록 지우기"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {copied && <p className="mt-3 text-xs font-bold text-emerald-600">클립보드에 복사했습니다.</p>}

          {entries.length === 0 ? (
            <div className="grid min-h-44 place-items-center text-center text-sm text-slate-400">
              아직 기록이 없습니다.<br />마이크를 켜고 영어로 말해보세요.
            </div>
          ) : (
            <ol className="mt-4 space-y-3">
              {entries.map((entry, index) => (
                <li key={entry.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-700">{entry.text}</p>
                      {entry.alternatives.length > 0 && (
                        <p className="mt-1 break-words text-xs text-slate-400">
                          후보: {entry.alternatives.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
