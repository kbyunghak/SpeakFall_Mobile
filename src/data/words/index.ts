import type { TrackType, WordItem } from "./types";
import { BASIC_WORDS } from "./basicWords";
import { ELEMENTARY_WORDS } from "./elementaryWords";
import { MIDDLE_WORDS } from "./middleWords";
import { HIGH_WORDS } from "./highWords";
import { BIZ_WORDS } from "./bizWords";
import { PRO_WORDS } from "./proWords";

export * from "./types";
export { BASIC_WORDS, ELEMENTARY_WORDS, MIDDLE_WORDS, HIGH_WORDS, BIZ_WORDS, PRO_WORDS };

/** 전체 트랙 데이터 바인딩 */
export const WORDS: WordItem[] = [
  ...BASIC_WORDS,
  ...ELEMENTARY_WORDS,
  ...MIDDLE_WORDS,
  ...HIGH_WORDS,
  ...BIZ_WORDS,
  ...PRO_WORDS,
];

/** 기존 이름 호환용 별칭 */
export const WORD_POOL = WORDS;

export const TOTAL_LEVELS = 10;

/** 특정 트랙 및 레벨의 단어 조회 (기본값: basic) */
export function getWordsByTrackLevel(level: number, track: TrackType = "basic"): WordItem[] {
  return WORDS.filter((item) => (item.track ?? "basic") === track && item.level === level);
}

/** 랜덤 단어 추출 (기본값: basic) */
export function getRandomWord(
  level: number,
  track: TrackType = "basic",
  exclude: readonly string[] = [],
): WordItem | undefined {
  const blocked = new Set(exclude.map((word) => word.toLowerCase()));
  const candidates = getWordsByTrackLevel(level, track).filter(
    ({ word }) => !blocked.has(word.toLowerCase()),
  );
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** 데이터 무결성 검사 (개발용) */
export function validateWords(): void {
  const seen = new Set<string>();
  for (const item of WORDS) {
    const key = `${item.track ?? "basic"}-${item.word.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Duplicate word in track [${item.track}]: ${item.word}`);
    if (!item.ipa || !item.meaning) throw new Error(`Incomplete word: ${item.word}`);
    seen.add(key);
  }
}
