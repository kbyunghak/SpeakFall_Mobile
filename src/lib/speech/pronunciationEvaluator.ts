import type { WordItem } from "@/data/words";
import { similarity, type Strictness } from "@/lib/speakfall/words";
import { getMinimalPairConflict } from "./minimalPairs";
import type { SpeechResult } from "./types";

export type PronunciationEvaluation = {
  accepted: boolean;
  score: number;
  bestCandidate: string;
  engine: SpeechResult["engine"];
  reason: "exact" | "similar" | "minimal-pair-conflict" | "no-match";
  minimalPairConflict?: string;
  pronunciationScore?: number;
};

type EvaluationOptions = {
  target: WordItem;
  result: SpeechResult;
  strictness: Strictness;
  trackLeniency?: number;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isExactAccepted = (candidate: string, acceptedWords: string[]) =>
  acceptedWords.includes(normalize(candidate));

export function evaluatePronunciation({
  target,
  result,
  strictness,
  trackLeniency = 0,
}: EvaluationOptions): PronunciationEvaluation {
  const candidates = [result.transcript, ...result.alternatives.map(({ transcript }) => transcript)]
    .map(normalize)
    .filter(Boolean)
    .slice(0, 5);
  const acceptedWords = [target.word, ...(target.accepts ?? [])].map(normalize);
  const topCandidate = candidates[0] ?? "";
  const exactIndex = candidates.findIndex((candidate) => isExactAccepted(candidate, acceptedWords));
  const minimalPairConflict = getMinimalPairConflict(target.word, topCandidate) ?? undefined;
  const base = {
    engine: result.engine,
    pronunciationScore: result.pronunciation?.overallScore,
  };

  if (strictness === "hard") {
    const accepted = isExactAccepted(topCandidate, acceptedWords);
    return {
      ...base,
      accepted,
      score: accepted ? 1 : similarity(target.word, topCandidate),
      bestCandidate: topCandidate,
      reason: accepted ? "exact" : minimalPairConflict ? "minimal-pair-conflict" : "no-match",
      minimalPairConflict,
    };
  }

  if (strictness === "normal") {
    const accepted = exactIndex >= 0;
    return {
      ...base,
      accepted,
      score: accepted ? 1 : Math.max(0, ...candidates.map((word) => similarity(target.word, word))),
      bestCandidate: accepted ? candidates[exactIndex]! : topCandidate,
      reason: accepted ? "exact" : minimalPairConflict ? "minimal-pair-conflict" : "no-match",
      minimalPairConflict,
    };
  }

  if (minimalPairConflict) {
    return {
      ...base,
      accepted: false,
      score: similarity(target.word, topCandidate),
      bestCandidate: topCandidate,
      reason: "minimal-pair-conflict",
      minimalPairConflict,
    };
  }

  if (exactIndex >= 0) {
    return {
      ...base,
      accepted: true,
      score: 1,
      bestCandidate: candidates[exactIndex]!,
      reason: "exact",
    };
  }

  const scored = candidates.map((candidate) => ({
    candidate,
    score: similarity(target.word, candidate),
  }));
  const best = scored.reduce((current, item) => (item.score > current.score ? item : current), {
    candidate: topCandidate,
    score: 0,
  });
  const threshold = Math.max(0.55, 0.75 - trackLeniency);
  const accepted = best.score >= threshold;
  return {
    ...base,
    accepted,
    score: best.score,
    bestCandidate: best.candidate,
    reason: accepted ? "similar" : "no-match",
  };
}
