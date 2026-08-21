import { describe, expect, test } from "bun:test";
import { PRONUNCIATION_FOCUSES } from "@/lib/speakfall/words";
import { getMinimalPairConflict, MINIMAL_PAIRS } from "./minimalPairs";

describe("minimal pairs", () => {
  test.each([
    ["bed", "bad", "bad"],
    ["bad", "bed", "bed"],
    ["ship", "sheep", "sheep"],
    ["sheep", "ship", "ship"],
    ["full", "fool", "fool"],
    ["fool", "full", "full"],
  ])("%s와 %s의 양방향 충돌을 찾는다", (target, spoken, conflict) => {
    expect(getMinimalPairConflict(target, spoken)).toBe(conflict);
  });

  test("대소문자와 구두점을 정규화한다", () => {
    expect(getMinimalPairConflict("Full!", "FOOL.")).toBe("fool");
  });

  test("관계없는 단어는 충돌하지 않는다", () => {
    expect(getMinimalPairConflict("walk", "book")).toBeNull();
  });

  test("full-fool을 ʊ / uː 그룹에 둔다", () => {
    expect(PRONUNCIATION_FOCUSES).toContain("ʊ / uː");
    expect(MINIMAL_PAIRS["ʊ / uː"]).toContainEqual(["full", "fool"]);
  });
});
