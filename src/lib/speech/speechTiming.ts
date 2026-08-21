import type { WordItem } from "@/data/words";

export const DEFAULT_UTTERANCE_END_TIMEOUT_MS = 600;
export const MONOSYLLABLE_UTTERANCE_END_TIMEOUT_MS = 850;

const IPA_VOWEL_NUCLEUS = /[aeiouyɐɑɒæɔəɚɛɜɝɞɨɪɯɵʉʊʌʏøœɶɤɯ]+/gu;

/** IPA의 모음 핵 개수로 짧은 1음절 단어인지 판별합니다. */
export function isMonosyllableWord(item: Pick<WordItem, "ipa">): boolean {
  return (item.ipa.match(IPA_VOWEL_NUCLEUS) ?? []).length === 1;
}

export function getUtteranceEndTimeoutMs(item: Pick<WordItem, "ipa">): number {
  return isMonosyllableWord(item)
    ? MONOSYLLABLE_UTTERANCE_END_TIMEOUT_MS
    : DEFAULT_UTTERANCE_END_TIMEOUT_MS;
}
