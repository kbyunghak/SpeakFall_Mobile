import type { WordItem } from "@/data/words";
import { similarity, type Strictness } from "@/lib/speakfall/words";
import { getMinimalPairConflict } from "./minimalPairs";
import { getCentralHomophones } from "./homophones";
import { normalizeSpeechText } from "./normalization";
import { isSafeSimilarityCandidate } from "./safeSimilarity";
import type { SpeechResult } from "./types";

export type PronunciationReason =
  | "top-exact"
  | "alternative-exact"
  | "top-homophone"
  | "alternative-homophone"
  | "top-natural-alias"
  | "alternative-natural-alias"
  | "similar"
  | "minimal-pair-conflict"
  | "no-match";

export type PronunciationEvaluation = {
  accepted: boolean;
  score: number;
  bestCandidate: string;
  engine: SpeechResult["engine"];
  reason: PronunciationReason;
  minimalPairConflict?: string;
  pronunciationScore?: number;
};

type EvaluationOptions = {
  target: WordItem;
  result: SpeechResult;
  strictness: Strictness;
  trackLeniency?: number;
};

const normalizeForms = (values: readonly string[] | undefined) =>
  new Set((values ?? []).map(normalizeSpeechText).filter(Boolean));

const findCandidate = (
  candidates: readonly string[],
  forms: ReadonlySet<string>,
  startIndex = 0,
) => {
  for (let index = startIndex; index < candidates.length; index += 1) {
    if (forms.has(candidates[index]!)) return index;
  }
  return -1;
};

export function evaluatePronunciation({
  target,
  result,
  strictness,
  trackLeniency = 0,
}: EvaluationOptions): PronunciationEvaluation {
  const candidates = [result.transcript, ...result.alternatives.map(({ transcript }) => transcript)]
    .map(normalizeSpeechText)
    .filter(Boolean)
    .slice(0, 5);
  const targetForm = normalizeSpeechText(target.word);
  const homophones = new Set([
    ...getCentralHomophones(target.word),
    ...normalizeForms(target.homophones),
  ]);
  const naturalAliases = normalizeForms(target.naturalAliases);
  const topCandidate = candidates[0] ?? "";
  const minimalPairConflict = getMinimalPairConflict(target.word, topCandidate) ?? undefined;
  const base = {
    engine: result.engine,
    pronunciationScore: result.pronunciation?.overallScore,
  };

  const acceptedResult = (
    candidateIndex: number,
    reason: PronunciationReason,
  ): PronunciationEvaluation => ({
    ...base,
    accepted: true,
    score: 1,
    bestCandidate: candidates[candidateIndex]!,
    reason,
  });

  const failedResult = (reason: PronunciationReason): PronunciationEvaluation => ({
    ...base,
    accepted: false,
    score: similarity(target.word, topCandidate),
    bestCandidate: topCandidate,
    reason,
    ...(reason === "minimal-pair-conflict" ? { minimalPairConflict } : {}),
  });

  if (topCandidate === targetForm) return acceptedResult(0, "top-exact");

  if (strictness === "hard") {
    if (homophones.has(topCandidate)) return acceptedResult(0, "top-homophone");
    return failedResult("no-match");
  }

  const alternativeExactIndex = candidates.indexOf(targetForm, 1);
  if (alternativeExactIndex >= 1) {
    return acceptedResult(alternativeExactIndex, "alternative-exact");
  }

  if (homophones.has(topCandidate)) return acceptedResult(0, "top-homophone");
  const alternativeHomophoneIndex = findCandidate(candidates, homophones, 1);
  if (alternativeHomophoneIndex >= 1) {
    return acceptedResult(alternativeHomophoneIndex, "alternative-homophone");
  }

  if (naturalAliases.has(topCandidate)) return acceptedResult(0, "top-natural-alias");
  const alternativeAliasIndex = findCandidate(candidates, naturalAliases, 1);
  if (alternativeAliasIndex >= 1) {
    return acceptedResult(alternativeAliasIndex, "alternative-natural-alias");
  }

  // normal은 현재 UI에서 사용하지 않는 레거시 모드입니다. 기존처럼 정확한
  // 후보만 인정하고 문자열 유사도는 적용하지 않습니다.
  if (strictness === "normal") {
    return failedResult(minimalPairConflict ? "minimal-pair-conflict" : "no-match");
  }

  if (minimalPairConflict) return failedResult("minimal-pair-conflict");

  const scored = candidates.map((candidate) => ({
    candidate,
    score: similarity(target.word, candidate),
    safe: isSafeSimilarityCandidate(target.word, candidate),
  }));
  const bestOverall = scored.reduce(
    (current, item) => (item.score > current.score ? item : current),
    {
      candidate: topCandidate,
      score: 0,
      safe: false,
    },
  );
  const bestSafe = scored
    .filter(({ safe }) => safe)
    .reduce((current, item) => (item.score > current.score ? item : current), {
      candidate: "",
      score: 0,
      safe: true,
    });
  const threshold = Math.max(0.55, 0.75 - trackLeniency);
  const accepted = bestSafe.score >= threshold;
  return {
    ...base,
    accepted,
    score: accepted ? bestSafe.score : bestOverall.score,
    bestCandidate: accepted ? bestSafe.candidate : bestOverall.candidate,
    reason: accepted ? "similar" : "no-match",
  };
}
