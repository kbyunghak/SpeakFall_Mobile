import { describe, expect, test } from "bun:test";
import type { WordItem } from "@/data/words";
import { evaluatePronunciation } from "./pronunciationEvaluator";
import type { SpeechResult } from "./types";

function word(value: string, options: Partial<WordItem> = {}): WordItem {
  return { word: value, ipa: "", level: 1, ...options };
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

describe("evaluatePronunciation 자연스럽게", () => {
  test("Top Exact를 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("bed"),
      result: result("Bed!"),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "top-exact" });
  });

  test("Alternative Exact를 minimal-pair conflict보다 먼저 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("bed"),
      result: result("bad", ["bed"]),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({
      accepted: true,
      reason: "alternative-exact",
      bestCandidate: "bed",
    });
  });

  test("Top Homophone을 normalize 후 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("rain", { homophones: ["reign"] }),
      result: result("Reign!"),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "top-homophone" });
  });

  test("Alternative Homophone을 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("rain", { homophones: ["reign"] }),
      result: result("lane", ["reign"]),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "alternative-homophone" });
  });

  test("Top Natural Alias를 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("pig", { naturalAliases: ["pick"] }),
      result: result("Pick!"),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "top-natural-alias" });
  });

  test("Alternative Natural Alias를 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("pig", { naturalAliases: ["pick"] }),
      result: result("big", ["PICK!"]),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({
      accepted: true,
      reason: "alternative-natural-alias",
      bestCandidate: "pick",
    });
  });

  test("Alternative Exact가 없으면 Top minimal-pair conflict로 실패한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("ship"),
      result: result("sheep", ["chip", "cheap"]),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({
      accepted: false,
      reason: "minimal-pair-conflict",
      minimalPairConflict: "sheep",
    });
  });

  test("안전한 문자열 유사도를 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("walk"),
      result: result("wal"),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "similar" });
  });

  test("관련 없는 발음은 no-match로 실패한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("walk"),
      result: result("book"),
      strictness: "easy",
    });
    expect(evaluation).toMatchObject({ accepted: false, reason: "no-match" });
  });
});

describe("evaluatePronunciation 꼼꼼하게", () => {
  test("Top Exact만 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("bed"),
      result: result("bed"),
      strictness: "hard",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "top-exact" });
  });

  test("Top Homophone은 성공 처리한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("bear", { homophones: ["bare"] }),
      result: result("bare"),
      strictness: "hard",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "top-homophone" });
  });

  test("Alternative Exact는 실패한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("bed"),
      result: result("bad", ["bed"]),
      strictness: "hard",
    });
    expect(evaluation).toMatchObject({ accepted: false, reason: "no-match" });
  });

  test("Alternative Homophone은 실패한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("rain", { homophones: ["reign"] }),
      result: result("lane", ["reign"]),
      strictness: "hard",
    });
    expect(evaluation.accepted).toBe(false);
  });

  test("Natural Alias는 실패한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("pig", { naturalAliases: ["pick"] }),
      result: result("pick"),
      strictness: "hard",
    });
    expect(evaluation.accepted).toBe(false);
  });

  test("문자열 유사도는 실패한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("walk"),
      result: result("wal"),
      strictness: "hard",
    });
    expect(evaluation.accepted).toBe(false);
  });
});

describe("evaluatePronunciation 레거시 normal", () => {
  test("Alternative Exact를 계속 인정한다", () => {
    const evaluation = evaluatePronunciation({
      target: word("cut"),
      result: result("put", ["cat", "cut"]),
      strictness: "normal",
    });
    expect(evaluation).toMatchObject({ accepted: true, reason: "alternative-exact" });
  });

  test("문자열 유사도는 인정하지 않는다", () => {
    const evaluation = evaluatePronunciation({
      target: word("walk"),
      result: result("wal"),
      strictness: "normal",
    });
    expect(evaluation.accepted).toBe(false);
  });
});
