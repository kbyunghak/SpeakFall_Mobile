import { normalizeSpeechText } from "./normalization";

/** 실기기 또는 기존 데이터에서 검증된 안전한 동음어 그룹만 중앙 관리합니다. */
export const HOMOPHONE_GROUPS: readonly (readonly string[])[] = [
  ["eye", "i"],
  ["two", "to", "too"],
  ["bear", "bare"],
  ["rain", "reign"],
];

const HOMOPHONE_INDEX = new Map<string, ReadonlySet<string>>();

for (const group of HOMOPHONE_GROUPS) {
  const normalized = [...new Set(group.map(normalizeSpeechText).filter(Boolean))];
  for (const word of normalized) {
    HOMOPHONE_INDEX.set(word, new Set(normalized.filter((candidate) => candidate !== word)));
  }
}

export function getCentralHomophones(word: string): ReadonlySet<string> {
  return HOMOPHONE_INDEX.get(normalizeSpeechText(word)) ?? new Set<string>();
}

export function areHomophones(left: string, right: string): boolean {
  const normalizedLeft = normalizeSpeechText(left);
  const normalizedRight = normalizeSpeechText(right);
  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) return false;
  return HOMOPHONE_INDEX.get(normalizedLeft)?.has(normalizedRight) ?? false;
}
