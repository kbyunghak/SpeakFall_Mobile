import { describe, expect, test } from "bun:test";
import {
  MAX_PRONUNCIATION_ATTEMPTS,
  registerPronunciationMismatch,
} from "./speechAttempts";

describe("pronunciation attempts", () => {
  test("첫 번째와 두 번째 오답은 같은 단어를 재시도한다", () => {
    expect(registerPronunciationMismatch(0)).toEqual({ missCount: 1, terminal: false });
    expect(registerPronunciationMismatch(1)).toEqual({ missCount: 2, terminal: false });
  });

  test("세 번째 오답은 현재 단어의 최종 실패가 된다", () => {
    expect(registerPronunciationMismatch(2)).toEqual({
      missCount: MAX_PRONUNCIATION_ATTEMPTS,
      terminal: true,
    });
  });

  test("최종 실패 이후 횟수는 최대값을 넘지 않는다", () => {
    expect(registerPronunciationMismatch(3)).toEqual({
      missCount: MAX_PRONUNCIATION_ATTEMPTS,
      terminal: true,
    });
  });

  test("잘못된 음수 횟수는 0회로 보정한다", () => {
    expect(registerPronunciationMismatch(-1)).toEqual({
      missCount: 1,
      terminal: false,
    });

    expect(registerPronunciationMismatch(-100)).toEqual({
      missCount: 1,
      terminal: false,
    });
  });
});
