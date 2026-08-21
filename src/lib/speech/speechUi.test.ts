import { describe, expect, test } from "bun:test";
import { getSpeechUiMessage, SPEECH_MISMATCH_FEEDBACK_MS } from "./speechUi";
import type { SpeechUiState } from "./types";

describe("speech UI state", () => {
  test.each<[SpeechUiState, string]>([
    ["ready", "“bed” 말해보세요"],
    ["listening", "듣고 있어요…"],
    ["checking", "발음을 확인하고 있어요…"],
    ["success", "성공! 친구를 구했어요"],
    ["mismatch", "“bad”로 들었어요\n“bed” 다시 말해보세요"],
    ["no-speech", "잘 못 알아들었어요. 다시 말해주세요"],
    ["error", "마이크 연결을 확인해주세요"],
  ])("%s 상태 문구를 반환한다", (state, expected) => {
    expect(getSpeechUiMessage(state, { target: "bed", transcript: "bad" })).toBe(expected);
  });

  test("엔진 오류 메시지를 우선 표시한다", () => {
    expect(getSpeechUiMessage("error", { error: "마이크 권한이 필요합니다." })).toBe(
      "마이크 권한이 필요합니다.",
    );
  });

  test("오답 피드백 후 ready에서 다시 말하라는 문구를 표시한다", () => {
    expect(getSpeechUiMessage("ready", { target: "bed", retry: true })).toBe(
      "“bed” 다시 말해보세요",
    );
  });

  test("mismatch 안내는 700~900ms 범위로 유지한다", () => {
    expect(SPEECH_MISMATCH_FEEDBACK_MS).toBeGreaterThanOrEqual(700);
    expect(SPEECH_MISMATCH_FEEDBACK_MS).toBeLessThanOrEqual(900);
  });
});
