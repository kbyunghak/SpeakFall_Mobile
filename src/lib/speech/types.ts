export type SpeechEngineId = "android-speech" | "web-speech" | "whisper" | "azure-pronunciation";

/** 게임 화면에서 사용자에게 표시하는 음성 처리 상태입니다. */
export type SpeechUiState =
  "ready" | "listening" | "checking" | "success" | "mismatch" | "no-speech" | "error";

export type SpeechAlternative = {
  transcript: string;
  confidence?: number;
};

export type PhonemeScore = {
  phoneme: string;
  accuracyScore: number;
};

export type PronunciationAssessment = {
  overallScore?: number;
  phonemes?: PhonemeScore[];
};

/** 모든 음성 엔진이 게임에 전달하는 공통 결과 계약입니다. */
export type SpeechResult = {
  transcript: string;
  alternatives: SpeechAlternative[];
  engine: SpeechEngineId;
  timestamp: number;
  isFinal: boolean;
  confidence?: number;
  pronunciation?: PronunciationAssessment;
};

/** 향후 Android, Whisper, Azure 엔진이 구현할 공통 생명주기입니다. */
export interface SpeechEngine {
  readonly id: SpeechEngineId;
  start(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}
