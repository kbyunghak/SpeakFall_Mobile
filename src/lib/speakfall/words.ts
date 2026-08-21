/**
 * 게임 로직용 단어 유틸.
 * 단어 데이터 자체는 `src/data/words/*` 로 트랙별 분리되어 있습니다.
 */
import { WORDS, getWordsByTrackLevel } from "@/data/words";
import type { PronunciationFocus, TrackType, WordItem } from "@/data/words";

export * from "@/data/words";

/** Recognition strictness — how forgiving the pronunciation match is. */
export type Strictness = "easy" | "normal" | "hard";

export const STRICTNESS: Record<Strictness, { label: string; hint: string; threshold: number }> = {
  easy: { label: "쉬움", hint: "비슷한 발음도 통과해요", threshold: 0.55 },
  normal: { label: "보통", hint: "인식 후보에 정확한 단어가 필요해요", threshold: 0.72 },
  hard: { label: "어려움", hint: "첫 인식이 정확한 단어여야 해요", threshold: 0.88 },
};

/** 기본 레벨당 단어 수 */
export const WORDS_PER_LEVEL = 30;
/** 레벨업에 필요한 구조 횟수 */
export const RESCUES_PER_LEVEL_UP = WORDS_PER_LEVEL;
/** 틀릴 때 추가되는 단어 수 */
export const EXTRA_WORDS_ON_MISS = 1;
/** 라이프 감소 시 추가되는 단어 수 */
export const EXTRA_WORDS_ON_LIFE_LOST = 3;
/** 레벨당 최대 단어 수 상한 */
export const MAX_WORDS_PER_LEVEL = 40;

/** 현재 레벨에 맞는 단어 풀을 반환합니다. */
export function getWordsByLevel(level: number, track: TrackType = "basic"): WordItem[] {
  return getWordsByTrackLevel(level, track);
}

/** 기본 단어와 내려받은 추가 단어를 합치되 같은 영단어는 한 번만 유지합니다. */
export function mergeLevelWords(
  level: number,
  track: TrackType,
  additionalWords: readonly WordItem[] = [],
): WordItem[] {
  const merged = new Map<string, WordItem>();
  for (const item of getWordsByLevel(level, track)) {
    merged.set(item.word.trim().toLowerCase(), item);
  }
  for (const item of additionalWords) {
    if (item.level !== level || (item.track && item.track !== track)) continue;
    const key = item.word.trim().toLowerCase();
    if (!merged.has(key)) merged.set(key, { ...item, track });
  }
  return [...merged.values()];
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** 레벨 선택 시 통합 단어 풀을 한 번 섞어 필요한 출제 큐를 만듭니다. */
export function createLevelWordQueue(
  level: number,
  track: TrackType,
  additionalWords: readonly WordItem[],
  count: number,
  exclude: readonly string[] = [],
  recent: readonly string[] = [],
): WordItem[] {
  const blocked = new Set(exclude.map((word) => word.trim().toLowerCase()));
  const recentWords = new Set(recent.map((word) => word.trim().toLowerCase()));
  const available = mergeLevelWords(level, track, additionalWords).filter(
    ({ word }) => !blocked.has(word.trim().toLowerCase()),
  );
  const fresh = shuffled(available.filter(({ word }) => !recentWords.has(word.toLowerCase())));
  const seenRecently = shuffled(
    available.filter(({ word }) => recentWords.has(word.toLowerCase())),
  );
  return [...fresh, ...seenRecently].slice(0, Math.max(0, count));
}

export const PRONUNCIATION_FOCUSES: PronunciationFocus[] = [
  "r / l",
  "f / p",
  "v / b",
  "θ / s",
  "ɪ / iː",
  "æ / ɛ",
  "ʊ / uː",
];

/** 한국어 화자가 자주 혼동하는 최소대립 발음쌍을 반환합니다. */
export function getPronunciationFocuses(item: WordItem): PronunciationFocus[] {
  const pronunciation = item.ipa.toLowerCase();
  const focuses: PronunciationFocus[] = [];
  if (/[ɹrɫl]/.test(pronunciation)) focuses.push("r / l");
  if (/[fp]/.test(pronunciation)) focuses.push("f / p");
  if (/[vb]/.test(pronunciation)) focuses.push("v / b");
  if (/[θs]/.test(pronunciation)) focuses.push("θ / s");
  if (pronunciation.includes("ɪ") || pronunciation.includes("i")) focuses.push("ɪ / iː");
  if (/[æɛ]/.test(pronunciation)) focuses.push("æ / ɛ");
  if (pronunciation.includes("ʊ") || pronunciation.includes("uː")) focuses.push("ʊ / uː");
  return focuses;
}

export function getPronunciationFocus(item: WordItem): PronunciationFocus | null {
  return item.pronunciationFocus ?? getPronunciationFocuses(item)[0] ?? null;
}

/**
 * Pick a word for the current stage.
 * @param level - current game level (1~10)
 * @param exclude - words to exclude from selection
 * @param recent - recently seen words to deprioritize
 */
export function randomWord(
  level: number,
  exclude: string[] = [],
  recent: string[] = [],
  track: TrackType = "basic",
  pronunciationFocus: PronunciationFocus | null = null,
  additionalWords: readonly WordItem[] = [],
): WordItem {
  const pool = mergeLevelWords(level, track, additionalWords);
  const available = pool.filter((w) => !exclude.includes(w.word));

  // 우선: exclude에 없고 recent에도 없는 단어
  const fresh = available.filter((w) => !recent.includes(w.word));
  const baseList = fresh.length ? fresh : available.length ? available : pool.length ? pool : WORDS;
  const focused = pronunciationFocus
    ? baseList.filter((word) => getPronunciationFocuses(word).includes(pronunciationFocus))
    : [];
  const list = focused.length > 0 ? focused : baseList;
  const selected = list[Math.floor(Math.random() * list.length)]!;
  return pronunciationFocus ? { ...selected, pronunciationFocus } : selected;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** 음성 인식 결과와 일치하는 단어의 IPA를 찾아 피드백에 사용합니다. */
export function findTranscriptIpa(transcript: string): string | null {
  const normalized = normalize(transcript);
  const tokens = normalized.split(" ").filter(Boolean);
  const exactMatch = WORDS.find((item) => {
    const word = normalize(item.word);
    return word === normalized || tokens.includes(word);
  });
  if (exactMatch) return exactMatch.ipa;

  const commonRecognitionIpa: Record<string, string> = {
    put: "/pʊt/",
    pick: "/pɪk/",
    matt: "/mæt/",
    mac: "/mæk/",
    mop: "/mɑp/",
    past: "/pæst/",
    pan: "/pæn/",
    vest: "/vɛst/",
    best: "/bɛst/",
    sink: "/sɪŋk/",
    sheep: "/ʃiːp/",
  };
  for (const token of [normalized, ...tokens]) {
    if (commonRecognitionIpa[token]) return commonRecognitionIpa[token];
  }

  return null;
}

function editDistance(a: string, b: string): number {
  const s = normalize(a);
  const t = normalize(b);
  const d: number[][] = Array.from({ length: s.length + 1 }, (_, i) =>
    Array.from({ length: t.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (s[i - 1] === t[j - 1] ? 0 : 1),
      );
    }
  }
  return d[s.length]![t.length]!;
}

/** Levenshtein-based similarity, 0..1 */
export function similarity(a: string, b: string): number {
  const s = normalize(a);
  const t = normalize(b);
  if (!s || !t) return 0;
  if (s === t) return 1;
  return 1 - editDistance(s, t) / Math.max(s.length, t.length);
}

/** Best match score of a spoken transcript against a target word. */
export function scoreTranscript(
  item: WordItem,
  transcript: string,
  forgiveSingleSoundDifference = false,
): number {
  const spokenTokens = normalize(transcript).split(" ").filter(Boolean);
  // 허용 정책은 pronunciationEvaluator가 담당합니다. 이 함수는 목표 단어와의
  // 문자열 유사도만 계산하며 Homophone/Alias를 정답으로 확정하지 않습니다.
  const candidates = [item.word];
  let best = 0;
  for (const c of candidates) {
    best = Math.max(best, similarity(c, transcript));
    if (forgiveSingleSoundDifference && editDistance(c, transcript) === 1) {
      best = Math.max(best, 0.75);
    }
    for (const tok of spokenTokens) {
      best = Math.max(best, similarity(c, tok));
      if (forgiveSingleSoundDifference && editDistance(c, tok) === 1) {
        best = Math.max(best, 0.75);
      }
    }
  }
  return best;
}
