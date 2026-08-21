import { describe, expect, test } from "bun:test";
import { isSafeSimilarityCandidate } from "./safeSimilarity";

describe("safe similarity", () => {
  test("suffix deletion을 제외한다", () => {
    expect(isSafeSimilarityCandidate("museum", "museu")).toBe(false);
    expect(isSafeSimilarityCandidate("walk", "wal")).toBe(false);
  });

  test("prefix deletion을 제외한다", () => {
    expect(isSafeSimilarityCandidate("alive", "live")).toBe(false);
  });

  test("핵심 자음 삭제를 제외한다", () => {
    expect(isSafeSimilarityCandidate("plant", "pant")).toBe(false);
  });

  test("철자상 음절 핵 삭제를 제외한다", () => {
    expect(isSafeSimilarityCandidate("family", "famly")).toBe(false);
  });

  test("삭제가 아닌 가까운 모음 변이는 similarity 후보로 유지한다", () => {
    expect(isSafeSimilarityCandidate("walk", "wolk")).toBe(true);
  });
});
