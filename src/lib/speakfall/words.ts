/**
 * 게임 로직용 단어 유틸.
 * 단어 데이터 자체는 `src/data/words/*` 로 트랙별 분리되어 있습니다.
 */
import { WORDS, getWordsByTrackLevel } from "@/data/words";
import type { TrackType, WordItem } from "@/data/words";

export * from "@/data/words";

/** Recognition strictness — how forgiving the pronunciation match is. */
export type Strictness = "easy" | "normal" | "hard";

export const STRICTNESS: Record<
  Strictness,
  { label: string; hint: string; threshold: number }
> = {
  easy: { label: "쉬움", hint: "비슷하게만 들려도 통과해요", threshold: 0.55 },
  normal: { label: "보통", hint: "웬만큼 정확하면 통과해요", threshold: 0.72 },
  hard: { label: "어려움", hint: "정확한 단어로 들려야 통과해요", threshold: 0.88 },
};

/** 기본 레벨당 단어 수 */
export const WORDS_PER_LEVEL = 30;
/** 레벨업에 필요한 구조 횟수 */
export const RESCUES_PER_LEVEL_UP = 20;
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

/** 한국어 화자가 자주 혼동하는 자음 대비를 포함한 단어인지 확인합니다. */
export function getPronunciationFocus(item: WordItem): "p / f" | "b / v" | null {
  const pronunciation = item.ipa.toLowerCase();
  if (/[pf]/.test(pronunciation)) return "p / f";
  if (/[bv]/.test(pronunciation)) return "b / v";
  return null;
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
  preferPronunciationFocus = false,
): WordItem {
  const pool = getWordsByLevel(level, track);
  const available = pool.filter((w) => !exclude.includes(w.word));

  // 우선: exclude에 없고 recent에도 없는 단어
  const fresh = available.filter((w) => !recent.includes(w.word));
  const baseList = fresh.length ? fresh : available.length ? available : pool.length ? pool : WORDS;
  const focused = preferPronunciationFocus
    ? baseList.filter((word) => getPronunciationFocus(word) !== null)
    : [];
  const list = focused.length > 0 ? focused : baseList;
  return list[Math.floor(Math.random() * list.length)]!;
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

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
  const candidates = [item.word, ...(item.accepts ?? [])];
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
