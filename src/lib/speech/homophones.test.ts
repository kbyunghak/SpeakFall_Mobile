import { describe, expect, test } from "bun:test";
import { areHomophones, getCentralHomophones, HOMOPHONE_GROUPS } from "./homophones";

describe("central homophones", () => {
  test("초기 중앙 사전은 검증된 네 그룹만 포함한다", () => {
    expect(HOMOPHONE_GROUPS).toEqual([
      ["eye", "i"],
      ["two", "to", "too"],
      ["bear", "bare"],
      ["rain", "reign"],
    ]);
  });

  test("그룹 내 단어를 양방향 동음어로 판정한다", () => {
    expect(areHomophones("Eye!", "I")).toBe(true);
    expect(areHomophones("too", "two")).toBe(true);
    expect(getCentralHomophones("two")).toEqual(new Set(["to", "too"]));
  });

  test("STT 오인식은 동음어로 판정하지 않는다", () => {
    expect(areHomophones("fan", "pan")).toBe(false);
    expect(areHomophones("heart", "parked")).toBe(false);
    expect(areHomophones("big", "me")).toBe(false);
    expect(areHomophones("catch", "pitch")).toBe(false);
  });

  test("공백을 제거하지 않아 a live와 alive를 구분한다", () => {
    expect(areHomophones("a live", "alive")).toBe(false);
  });
});
