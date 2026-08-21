import { describe, expect, test } from "bun:test";
import {
  DEFAULT_UTTERANCE_END_TIMEOUT_MS,
  getUtteranceEndTimeoutMs,
  isMonosyllableWord,
  MONOSYLLABLE_UTTERANCE_END_TIMEOUT_MS,
} from "./speechTiming";

describe("STT utterance end timing", () => {
  test.each(["/ˈtu/", "/ˈfæn/", "/ˈʃɔɹt/", "/ˈhɑɹt/", "/ˈɛɡ/"])(
    "%s 1음절 단어를 850ms 실험군으로 분류한다",
    (ipa) => {
      expect(isMonosyllableWord({ ipa })).toBe(true);
      expect(getUtteranceEndTimeoutMs({ ipa })).toBe(MONOSYLLABLE_UTTERANCE_END_TIMEOUT_MS);
    },
  );

  test("2음절 이상 단어는 600ms를 유지한다", () => {
    expect(isMonosyllableWord({ ipa: "/ˈɛləfənt/" })).toBe(false);
    expect(getUtteranceEndTimeoutMs({ ipa: "/ˈɛləfənt/" })).toBe(DEFAULT_UTTERANCE_END_TIMEOUT_MS);
  });
});
