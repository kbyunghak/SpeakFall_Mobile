export const MAX_PRONUNCIATION_ATTEMPTS = 3;

export type PronunciationMismatchResult = {
  missCount: number;
  terminal: boolean;
};

export function registerPronunciationMismatch(
  currentMissCount: number,
): PronunciationMismatchResult {
  const normalizedCount = Math.max(0, currentMissCount);
  const missCount = Math.min(MAX_PRONUNCIATION_ATTEMPTS, normalizedCount + 1);

  return {
    missCount,
    terminal: missCount >= MAX_PRONUNCIATION_ATTEMPTS,
  };
}
