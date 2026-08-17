export type MinimalPairFocus = "r / l" | "f / p" | "v / b" | "θ / s" | "ɪ / iː" | "æ / ɛ";

/** 단어 목록이 아닌 실제 두 단어의 최소대립쌍 단위로 관리합니다. */
export const MINIMAL_PAIRS: Record<MinimalPairFocus, ReadonlyArray<readonly [string, string]>> = {
  "r / l": [
    ["right", "light"],
    ["rice", "lice"],
    ["road", "load"],
  ],
  "f / p": [
    ["fan", "pan"],
    ["fast", "past"],
    ["fold", "polled"],
  ],
  "v / b": [
    ["vest", "best"],
    ["vote", "boat"],
    ["very", "berry"],
  ],
  "θ / s": [
    ["think", "sink"],
    ["thin", "sin"],
    ["thank", "sank"],
  ],
  "ɪ / iː": [
    ["ship", "sheep"],
    ["sit", "seat"],
    ["live", "leave"],
  ],
  "æ / ɛ": [
    ["bad", "bed"],
    ["bat", "bet"],
    ["man", "men"],
  ],
};

const normalizeWord = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

export function getMinimalPairConflict(target: string, spoken: string): string | null {
  const normalizedTarget = normalizeWord(target);
  const normalizedSpoken = normalizeWord(spoken);

  for (const pairs of Object.values(MINIMAL_PAIRS)) {
    for (const [first, second] of pairs) {
      if (normalizedTarget === first && normalizedSpoken === second) return second;
      if (normalizedTarget === second && normalizedSpoken === first) return first;
    }
  }
  return null;
}
