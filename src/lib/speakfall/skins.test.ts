import { describe, expect, test } from "bun:test";
import { getEffectiveSkinEffect, getSkin } from "./skins";

describe("스킨 실제 효과", () => {
  test("무지개 우산은 실제 플레이에서도 미리보기와 같은 가루 효과를 사용한다", () => {
    expect(getEffectiveSkinEffect(getSkin("umbrella"))).toBe("rain");
  });

  test("벚꽃·선셋·갤럭시·무지개 팝의 고유 효과를 유지한다", () => {
    expect(getEffectiveSkinEffect(getSkin("flower"))).toBe("petals");
    expect(getEffectiveSkinEffect(getSkin("sunset"))).toBe("sparkle");
    expect(getEffectiveSkinEffect(getSkin("galaxy"))).toBe("stars");
    expect(getEffectiveSkinEffect(getSkin("rainbow"))).toBe("confetti");
  });
});
