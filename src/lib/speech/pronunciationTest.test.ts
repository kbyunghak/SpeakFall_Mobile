import { describe, expect, test } from "bun:test";
import type { WordItem } from "@/data/words";
import {
  countPronunciationTestResults,
  paginatePronunciationTestWords,
  parsePronunciationTestResults,
  pronunciationTestResultKey,
  upsertPronunciationTestResult,
  type PronunciationTestResult,
} from "./pronunciationTest";

const words: WordItem[] = Array.from({ length: 100 }, (_, index) => ({
  word: `word-${index + 1}`,
  ipa: `/w${index + 1}/`,
  meaning: `단어 ${index + 1}`,
  level: 1,
}));

const result = (word: string): PronunciationTestResult => ({
  track: "basic",
  level: 1,
  word,
  transcript: word,
  alternatives: [],
  natural: { accepted: true, reason: "top-exact" },
  precise: { accepted: true, reason: "top-exact" },
  testedAt: 1,
});

describe("pronunciation test pagination", () => {
  test("10/25/50/100 페이지 크기에서 전체 기준 순번을 유지한다", () => {
    for (const size of [10, 25, 50, 100] as const) {
      const page = paginatePronunciationTestWords(words, 2, size);
      const expectedPage = size === 100 ? 1 : 2;
      const expectedStart = size === 100 ? 1 : size + 1;
      expect(page.page).toBe(expectedPage);
      expect(page.items[0]?.order).toBe(expectedStart);
      expect(page.total).toBe(100);
    }
  });

  test("범위를 벗어난 페이지를 마지막 페이지로 보정한다", () => {
    const page = paginatePronunciationTestWords(words, 99, 25);
    expect(page.page).toBe(4);
    expect(page.start).toBe(76);
    expect(page.end).toBe(100);
  });
});

describe("pronunciation test result persistence model", () => {
  test("같은 단어의 재검사 결과를 교체하고 완료 수는 중복 계산하지 않는다", () => {
    const first = upsertPronunciationTestResult({}, result("eye"));
    const second = upsertPronunciationTestResult(first, {
      ...result("eye"),
      transcript: "I",
      testedAt: 2,
    });
    expect(countPronunciationTestResults(second, "basic", 1)).toBe(1);
    expect(second[pronunciationTestResultKey("basic", 1, "eye")]?.transcript).toBe("I");
  });

  test("트랙과 레벨별 테스트 완료 수를 분리한다", () => {
    const basic = upsertPronunciationTestResult({}, result("eye"));
    const mixed = upsertPronunciationTestResult(basic, {
      ...result("apple"),
      track: "elementary",
    });
    expect(countPronunciationTestResults(mixed, "basic", 1)).toBe(1);
    expect(countPronunciationTestResults(mixed, "elementary", 1)).toBe(1);
  });

  test("손상된 저장 데이터는 빈 결과로 복구한다", () => {
    expect(parsePronunciationTestResults("not-json")).toEqual({});
    expect(parsePronunciationTestResults("[]")).toEqual({});
  });
});
