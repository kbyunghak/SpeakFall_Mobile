import { describe, expect, test } from "bun:test";
import { backDestinationForPhase } from "./navigation";

describe("SpeakFall 상단 뒤로가기", () => {
  test("단어 섬 고르기에서는 메인 화면으로 이동한다", () => {
    expect(backDestinationForPhase("island")).toBe("idle");
  });

  test("단어 도감에서는 단어 섬 고르기로 이동한다", () => {
    expect(backDestinationForPhase("collection")).toBe("island");
  });

  test("스킨 상점에서는 단어 섬 고르기로 이동한다", () => {
    expect(backDestinationForPhase("shop")).toBe("island");
  });

  test("레벨 지도에서는 단어 섬 고르기로 이동한다", () => {
    expect(backDestinationForPhase("map")).toBe("island");
  });
});
