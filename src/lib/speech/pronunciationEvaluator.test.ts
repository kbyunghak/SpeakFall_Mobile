import { describe, expect, test } from "bun:test";
import type { WordItem } from "@/data/words";
import { evaluatePronunciation } from "./pronunciationEvaluator";
import type { SpeechResult } from "./types";

function word(value: string): WordItem {
  return { word: value, ipa: "", level: 1 };
}

function result(transcript: string, alternatives: string[] = []): SpeechResult {
  return {
    transcript,
    alternatives: alternatives.map((candidate) => ({ transcript: candidate })),
    engine: "android-speech",
    timestamp: 1,
    isFinal: true,
  };
}

describe("evaluatePronunciation", () => {
  test("Easy accepts a similar non-conflicting word", () => {
    const evaluation = evaluatePronunciation({
      target: word("walk"),
      result: result("wal"),
      strictness: "easy",
    });
    expect(evaluation.accepted).toBe(true);
    expect(evaluation.reason).toBe("similar");
  });

  test("Easy rejects an actual minimal-pair conflict", () => {
    const evaluation = evaluatePronunciation({
      target: word("ship"),
      result: result("sheep"),
      strictness: "easy",
    });
    expect(evaluation.accepted).toBe(false);
    expect(evaluation.reason).toBe("minimal-pair-conflict");
    expect(evaluation.minimalPairConflict).toBe("sheep");
  });

  test("Easy rejects a Top 1 minimal-pair conflict even when the target is an alternative", () => {
    const evaluation = evaluatePronunciation({
      target: word("ship"),
      result: result("sheep", ["ship"]),
      strictness: "easy",
    });
    expect(evaluation.accepted).toBe(false);
    expect(evaluation.reason).toBe("minimal-pair-conflict");
  });

  test("Normal accepts an exact match in the alternatives", () => {
    const evaluation = evaluatePronunciation({
      target: word("cut"),
      result: result("put", ["cat", "cut"]),
      strictness: "normal",
    });
    expect(evaluation.accepted).toBe(true);
    expect(evaluation.bestCandidate).toBe("cut");
  });

  test("Normal rejects similarity without an exact candidate", () => {
    const evaluation = evaluatePronunciation({
      target: word("walk"),
      result: result("wal"),
      strictness: "normal",
    });
    expect(evaluation.accepted).toBe(false);
  });

  test("Hard requires an exact Top 1 result", () => {
    const evaluation = evaluatePronunciation({
      target: word("cut"),
      result: result("put", ["cut"]),
      strictness: "hard",
    });
    expect(evaluation.accepted).toBe(false);
    expect(evaluation.bestCandidate).toBe("put");
  });

  test("Hard does not accept the target merely as a token inside a sentence", () => {
    const evaluation = evaluatePronunciation({
      target: word("cut"),
      result: result("I said cut"),
      strictness: "hard",
    });
    expect(evaluation.accepted).toBe(false);
  });
});
