import { describe, expect, test } from "bun:test";

import {
  createLevelWordQueue,
  mergeLevelWords,
  PROCESSED_WORDS_PER_LEVEL,
  shouldEndRoundForHp,
  WORDS_PER_LEVEL,
} from "./words";

describe("level word policy", () => {
  test("레벨당 기본 처리 단어 수는 30개다", () => {
    expect(WORDS_PER_LEVEL).toBe(30);
    expect(PROCESSED_WORDS_PER_LEVEL).toBe(WORDS_PER_LEVEL);
  });
});

describe("round completion policy", () => {
  test("하트가 1개 이상이면 라운드를 종료하지 않는다", () => {
    expect(shouldEndRoundForHp(5)).toBe(false);
    expect(shouldEndRoundForHp(1)).toBe(false);
  });

  test("하트가 0 이하이면 즉시 라운드를 종료한다", () => {
    expect(shouldEndRoundForHp(0)).toBe(true);
    expect(shouldEndRoundForHp(-1)).toBe(true);
    expect(shouldEndRoundForHp(-10)).toBe(true);
  });
});

describe("mergeLevelWords", () => {
  test("현재 레벨의 Archive 단어만 기본 단어에 합친다", () => {
    const merged = mergeLevelWords(1, "basic", [
      {
        word: "archive-only",
        ipa: "/a/",
        meaning: "추가",
        level: 1,
      },
      {
        word: "other-level",
        ipa: "/o/",
        meaning: "다른 레벨",
        level: 2,
      },
    ]);

    expect(
      merged.some(({ word }) => word === "archive-only"),
    ).toBe(true);

    expect(
      merged.some(({ word }) => word === "other-level"),
    ).toBe(false);
  });

  test("대소문자가 다른 중복 단어는 기본 단어를 우선한다", () => {
    const base = mergeLevelWords(1, "basic");
    const original = base[0]!;

    const merged = mergeLevelWords(1, "basic", [
      {
        ...original,
        word: original.word.toUpperCase(),
        meaning: "중복",
      },
    ]);

    expect(merged).toHaveLength(base.length);

    expect(
      merged.find(({ word }) => word === original.word)?.meaning,
    ).toBe(original.meaning);
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

    const queue = createLevelWordQueue(
      1,
      "basic",
      additions,
      30,
    );

    expect(queue).toHaveLength(30);

    expect(
      new Set(queue.map(({ word }) => word.toLowerCase())).size,
    ).toBe(30);
  });

  test("이미 사용하거나 대기 중인 단어는 제외한다", () => {
    const additions = [
      {
        word: "archive-only",
        ipa: "/a/",
        meaning: "추가",
        level: 1 as const,
      },
    ];

    const queue = createLevelWordQueue(
      1,
      "basic",
      additions,
      200,
      ["archive-only"],
    );

    expect(
      queue.some(({ word }) => word === "archive-only"),
    ).toBe(false);
  });

  test("exclude는 대소문자를 무시한다", () => {
    const additions = [
      {
        word: "Archive-Only",
        ipa: "/a/",
        meaning: "추가",
        level: 1 as const,
      },
    ];

    const queue = createLevelWordQueue(
      1,
      "basic",
      additions,
      200,
      ["archive-only"],
    );

    expect(
      queue.some(
        ({ word }) =>
          word.toLowerCase() === "archive-only",
      ),
    ).toBe(false);
  });

  test("요청 개수가 0 이하이면 빈 큐를 반환한다", () => {
    expect(
      createLevelWordQueue(1, "basic", [], 0),
    ).toEqual([]);

    expect(
      createLevelWordQueue(1, "basic", [], -5),
    ).toEqual([]);
  });
});