import { describe, expect, test } from "bun:test";
import {
  DEFAULT_JELLY_ID,
  JELLY_COLOR_ORDER,
  JELLY_CATEGORY_ORDER,
  SPECIAL_JELLIES,
  getSpecialJelly,
} from "./specialJellies";

describe("젤리 스킨 카탈로그", () => {
  test("카테고리별 가격이 기획과 일치한다", () => {
    const prices = {
      default: 0,
      color: 3_000,
      glitter: 5_000,
      pudding: 5_000,
      fruit: 5_000,
      bear: 10_000,
      dragon: 10_000,
    } as const;

    for (const jelly of SPECIAL_JELLIES) {
      expect(jelly.price).toBe(prices[jelly.category]);
    }
  });

  test("모든 카테고리는 같은 순서의 8가지 색상을 가진다", () => {
    for (const category of JELLY_CATEGORY_ORDER) {
      const categoryJellies = SPECIAL_JELLIES.filter((jelly) => jelly.category === category);
      expect(categoryJellies).toHaveLength(8);
      expect(categoryJellies.map((jelly) => jelly.color)).toEqual([...JELLY_COLOR_ORDER]);
    }
    expect(new Set(SPECIAL_JELLIES.map((jelly) => jelly.id)).size).toBe(SPECIAL_JELLIES.length);
  });

  test("기본 젤리 8종은 무료이며 개별 이미지 캐릭터를 사용한다", () => {
    const defaultJellies = SPECIAL_JELLIES.filter((jelly) => jelly.category === "default");
    expect(getSpecialJelly(DEFAULT_JELLY_ID).color).toBe("green");
    expect(defaultJellies.every((jelly) => jelly.price === 0)).toBeTrue();
    expect(defaultJellies.every((jelly) => Boolean(jelly.image))).toBeTrue();
  });

  test("이전 단일 상점 ID 대신 카테고리-색상 ID를 사용한다", () => {
    expect(SPECIAL_JELLIES.some((jelly) => jelly.id === "sky-blue")).toBeFalse();
    expect(SPECIAL_JELLIES.some((jelly) => jelly.id === "color-blue")).toBeTrue();
  });
});
