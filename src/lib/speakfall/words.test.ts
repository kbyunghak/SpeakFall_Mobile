import { describe, expect, test } from "bun:test";
import { createLevelWordQueue, mergeLevelWords } from "./words";

describe("mergeLevelWords", () => {
  test("현재 레벨의 Archive 단어만 기본 단어에 합친다", () => {
    const merged = mergeLevelWords(1, "basic", [
      { word: "archive-only", ipa: "/a/", meaning: "추가", level: 1 },
      { word: "other-level", ipa: "/o/", meaning: "다른 레벨", level: 2 },
    ]);
    expect(merged.some(({ word }) => word === "archive-only")).toBe(true);
    expect(merged.some(({ word }) => word === "other-level")).toBe(false);
  });

  test("대소문자가 다른 중복 단어는 기본 단어를 우선한다", () => {
    const base = mergeLevelWords(1, "basic");
    const original = base[0]!;
    const merged = mergeLevelWords(1, "basic", [
      { ...original, word: original.word.toUpperCase(), meaning: "중복" },
    ]);
    expect(merged).toHaveLength(base.length);
    expect(merged.find(({ word }) => word === original.word)?.meaning).toBe(original.meaning);
  });
});

describe("createLevelWordQueue", () => {
  test("기본과 Archive 통합 풀에서 중복 없는 요청 개수를 뽑는다", () => {
    const additions = Array.from({ length: 10 }, (_, index) => ({
      word: `archive-${index}`,
      ipa: "/a/",
      meaning: "추가",
      level: 1 as const,
    }));
    const queue = createLevelWordQueue(1, "basic", additions, 30);
    expect(queue).toHaveLength(30);
    expect(new Set(queue.map(({ word }) => word.toLowerCase())).size).toBe(30);
  });

  test("이미 사용하거나 대기 중인 단어는 제외한다", () => {
    const additions = [{ word: "archive-only", ipa: "/a/", meaning: "추가", level: 1 as const }];
    const queue = createLevelWordQueue(1, "basic", additions, 200, ["archive-only"]);
    expect(queue.some(({ word }) => word === "archive-only")).toBe(false);
  });
});
