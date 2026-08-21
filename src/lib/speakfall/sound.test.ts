import { describe, expect, test } from "bun:test";
import { GAMEPLAY_BGM_FADE_MS } from "./sound";

describe("SpeakFall gameplay BGM", () => {
  test("첫 낙하 시 300~500ms 범위에서 fade-out한다", () => {
    expect(GAMEPLAY_BGM_FADE_MS).toBeGreaterThanOrEqual(300);
    expect(GAMEPLAY_BGM_FADE_MS).toBeLessThanOrEqual(500);
  });
});
