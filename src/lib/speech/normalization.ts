/** 음성 인식 비교용 정규화. 단어 경계를 보존해 `a live`와 `alive`를 구분합니다. */
export function normalizeSpeechText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
