import { describe, expect, it } from "bun:test";
import { starsForResult } from "./progress";

describe("starsForResult", () => {
  it("구조 성공 수에 따라 별점을 계산한다", () => {
    expect(starsForResult(true, 17)).toBe(0);

    expect(starsForResult(true, 18)).toBe(1);
    expect(starsForResult(true, 22)).toBe(1);

    expect(starsForResult(true, 23)).toBe(2);
    expect(starsForResult(true, 26)).toBe(2);

    expect(starsForResult(true, 27)).toBe(3);
    expect(starsForResult(true, 30)).toBe(3);
  });

  it("클리어하지 못하면 구조 수와 관계없이 별 0개다", () => {
    expect(starsForResult(false, 0)).toBe(0);
    expect(starsForResult(false, 17)).toBe(0);
    expect(starsForResult(false, 18)).toBe(0);
    expect(starsForResult(false, 23)).toBe(0);
    expect(starsForResult(false, 27)).toBe(0);
    expect(starsForResult(false, 30)).toBe(0);
  });

  it("0~17개 구조는 별 0개다", () => {
    for (let rescued = 0; rescued <= 17; rescued += 1) {
      expect(starsForResult(true, rescued)).toBe(0);
    }
  });

  it("18~22개 구조는 별 1개다", () => {
    for (let rescued = 18; rescued <= 22; rescued += 1) {
      expect(starsForResult(true, rescued)).toBe(1);
    }
  });

  it("23~26개 구조는 별 2개다", () => {
    for (let rescued = 23; rescued <= 26; rescued += 1) {
      expect(starsForResult(true, rescued)).toBe(2);
    }
  });

  it("27~30개 구조는 별 3개다", () => {
    for (let rescued = 27; rescued <= 30; rescued += 1) {
      expect(starsForResult(true, rescued)).toBe(3);
    }
  });

  it("구조 성공 수가 증가해도 별점이 감소하지 않는다", () => {
    let previousStars = 0;

    for (let rescued = 0; rescued <= 30; rescued += 1) {
      const stars = starsForResult(true, rescued);

      expect(stars).toBeGreaterThanOrEqual(previousStars);

      previousStars = stars;
    }
  });

  it("별점은 항상 0~3 범위다", () => {
    for (let rescued = 0; rescued <= 30; rescued += 1) {
      const stars = starsForResult(true, rescued);

      expect(stars).toBeGreaterThanOrEqual(0);
      expect(stars).toBeLessThanOrEqual(3);
    }
  });
});
