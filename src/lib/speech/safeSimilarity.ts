import { normalizeSpeechText } from "./normalization";

const VOWEL_NUCLEUS = /[aeiouy]+/g;
const CONSONANT = /[^bcdfghjklmnpqrstvwxz]/g;

function isStrictSubsequence(shorter: string, longer: string): boolean {
  if (!shorter || shorter.length >= longer.length) return false;
  let index = 0;
  for (const character of longer) {
    if (character === shorter[index]) index += 1;
  }
  return index === shorter.length;
}

/**
 * 문자열 similarity가 발음의 핵심 부분 삭제를 정답으로 승격시키지 않도록 합니다.
 * Exact/Homophone/Alias 판정 이후의 마지막 fallback에서만 사용합니다.
 */
export function isSafeSimilarityCandidate(target: string, candidate: string): boolean {
  const targetForm = normalizeSpeechText(target).replace(/\s/g, "");
  const candidateForm = normalizeSpeechText(candidate).replace(/\s/g, "");
  if (!targetForm || !candidateForm) return false;
  if (candidateForm.length >= targetForm.length) return true;

  // museum → museu, alive → live처럼 앞이나 뒤가 잘린 후보
  if (targetForm.startsWith(candidateForm) || targetForm.endsWith(candidateForm)) return false;

  // plant → pant처럼 핵심 자음이 삭제된 후보
  const targetConsonants = targetForm.replace(CONSONANT, "");
  const candidateConsonants = candidateForm.replace(CONSONANT, "");
  if (isStrictSubsequence(candidateConsonants, targetConsonants)) return false;

  // family → famly처럼 철자상 모음 핵이 줄어든 후보
  const targetSyllableNuclei = targetForm.match(VOWEL_NUCLEUS)?.length ?? 0;
  const candidateSyllableNuclei = candidateForm.match(VOWEL_NUCLEUS)?.length ?? 0;
  if (candidateSyllableNuclei < targetSyllableNuclei) return false;

  return true;
}
