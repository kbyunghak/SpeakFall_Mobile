/** 단어 트랙(월드) 구분 */
export type TrackType = "basic" | "elementary" | "middle" | "high" | "biz" | "pro";

/** 게임 레벨 (1~10) */
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface WordItem {
  word: string;
  /** 발음 기호 */
  ipa: string;
  /** 소속 트랙 (미지정 시 basic) */
  track?: TrackType;
  /** 주제 태그 (예: science, history) */
  topic?: string;
  /** 트랙 내 레벨 */
  level: Difficulty;
  /** 단어 난이도 별점 */
  stars?: 1 | 2 | 3;
  meaning?: string;
  /** ASR이 자주 혼동하는 발음 후보 */
  accepts?: string[];
  /** 어려움 모드에서 집중 연습할 최소대립 발음쌍 */
  pronunciationFocus?: PronunciationFocus;
}

export type PronunciationFocus =
  | "r / l"
  | "f / p"
  | "v / b"
  | "θ / s"
  | "ɪ / iː"
  | "æ / ɛ";
