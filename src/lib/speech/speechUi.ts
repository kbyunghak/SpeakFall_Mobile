import type { SpeechUiState } from "./types";

export const SPEECH_MISMATCH_FEEDBACK_MS = 800;
export const SPEECH_CHECKING_FEEDBACK_MS = 200;

type SpeechUiMessageOptions = {
  target?: string;
  transcript?: string;
  error?: string | null;
  retry?: boolean;
  terminalMismatch?: boolean;
};

export function getSpeechUiMessage(
  state: SpeechUiState,
  {
    target = "",
    transcript = "",
    error = null,
    retry = false,
    terminalMismatch = false,
  }: SpeechUiMessageOptions = {},
): string {
  switch (state) {
    case "ready":
      return target ? `“${target}” ${retry ? "다시 " : ""}말해보세요` : "말해보세요";
    case "listening":
      return "듣고 있어요…";
    case "checking":
      return "발음을 확인하고 있어요…";
    case "success":
      return "성공! 친구를 구했어요";
    case "mismatch":
      if (terminalMismatch) return "아쉬워요!\n다음 친구를 구해봐요";
      return transcript
        ? `“${transcript}”로 들었어요\n“${target}” 다시 말해보세요`
        : target
          ? `“${target}” 다시 말해보세요`
          : "다시 말해보세요";
    case "no-speech":
      return "잘 못 알아들었어요. 다시 말해주세요";
    case "error":
      return error || "마이크 연결을 확인해주세요";
  }
}
