import { getWordsByTrackLevel, type TrackType, type WordItem } from "@/data/words";
import type { PronunciationReason } from "./pronunciationEvaluator";

export const PRONUNCIATION_TEST_PAGE_SIZES = [10, 25, 50, 100] as const;
export type PronunciationTestPageSize = (typeof PRONUNCIATION_TEST_PAGE_SIZES)[number];

export type PronunciationTestVerdict = {
  accepted: boolean;
  reason: PronunciationReason;
};

export type PronunciationTestResult = {
  track: TrackType;
  level: number;
  word: string;
  transcript: string;
  alternatives: string[];
  natural: PronunciationTestVerdict;
  precise: PronunciationTestVerdict;
  testedAt: number;
};

export type PronunciationTestResultMap = Record<string, PronunciationTestResult>;

export type PronunciationTestPage = {
  items: Array<{ word: WordItem; order: number }>;
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
};

const STORAGE_KEY = "speakfall:pronunciation-test-results:v1";

export function pronunciationTestResultKey(track: TrackType, level: number, word: string): string {
  return `${track}:${level}:${word.trim().toLowerCase()}`;
}

export function getPronunciationTestWords(track: TrackType, level: number): WordItem[] {
  return getWordsByTrackLevel(level, track);
}

export function paginatePronunciationTestWords(
  words: readonly WordItem[],
  requestedPage: number,
  pageSize: PronunciationTestPageSize,
): PronunciationTestPage {
  const total = words.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const offset = (page - 1) * pageSize;
  const pageWords = words.slice(offset, offset + pageSize);
  return {
    items: pageWords.map((word, index) => ({ word, order: offset + index + 1 })),
    page,
    pageCount,
    total,
    start: total === 0 ? 0 : offset + 1,
    end: Math.min(offset + pageWords.length, total),
  };
}

export function countPronunciationTestResults(
  results: PronunciationTestResultMap,
  track: TrackType,
  level: number,
): number {
  const prefix = `${track}:${level}:`;
  return Object.keys(results).filter((key) => key.startsWith(prefix)).length;
}

export function upsertPronunciationTestResult(
  results: PronunciationTestResultMap,
  result: PronunciationTestResult,
): PronunciationTestResultMap {
  return {
    ...results,
    [pronunciationTestResultKey(result.track, result.level, result.word)]: result,
  };
}

export function parsePronunciationTestResults(value: string | null): PronunciationTestResultMap {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as PronunciationTestResultMap)
      : {};
  } catch {
    return {};
  }
}

export function loadPronunciationTestResults(): PronunciationTestResultMap {
  if (typeof window === "undefined") return {};
  return parsePronunciationTestResults(window.localStorage.getItem(STORAGE_KEY));
}

export function savePronunciationTestResults(results: PronunciationTestResultMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    // QA 기록 저장 실패가 게임 실행을 방해하지 않도록 메모리 상태는 유지합니다.
  }
}
