/**
 * 마이크 권한 상태 확인 / 요청 유틸.
 * 웹(브라우저)과 Capacitor 네이티브(Android/iOS) 양쪽을 지원합니다.
 */

export type MicStatus = "unknown" | "granted" | "denied" | "prompt" | "unsupported";

export type MicPlatform = "android" | "ios" | "web";

/** 첫 실행 안내를 이미 봤는지 저장하는 키 */
const ONBOARD_KEY = "speakfall.mic.onboarded";

export function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function getPlatform(): MicPlatform {
  if (typeof window === "undefined") return "web";
  const cap = (window as any).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "android" || p === "ios") return p;
  return "web";
}

/** 사용자에게 보여줄 설정 안내 문구 */
export function settingsHint(platform: MicPlatform = getPlatform()): string {
  switch (platform) {
    case "android":
      return "설정 → 애플리케이션 → 영단어 구조대 → 권한 → 마이크를 '허용'으로 바꿔 주세요.";
    case "ios":
      return "설정 → 영단어 구조대 → 마이크를 켜 주세요.";
    default:
      return "주소창 왼쪽 자물쇠(또는 ⓘ) 아이콘 → 마이크 → '허용'으로 바꾼 뒤 새로고침해 주세요.";
  }
}

/** 권한을 요청하지 않고 현재 상태만 조회 */
export async function checkMicPermission(): Promise<MicStatus> {
  if (typeof window === "undefined") return "unknown";

  if (isNativeRuntime()) {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const avail = await SpeechRecognition.available();
      if (!avail?.available) return "unsupported";
      const perm: any = await (SpeechRecognition as any).checkPermissions?.();
      const state = perm?.speechRecognition;
      if (state === "granted") return "granted";
      if (state === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";

  try {
    const status = await (navigator as any).permissions?.query?.({ name: "microphone" as any });
    if (status?.state === "granted") return "granted";
    if (status?.state === "denied") return "denied";
    if (status?.state === "prompt") return "prompt";
  } catch {
    /* Permissions API 미지원(Safari 등) */
  }
  return "unknown";
}

/** 실제 권한 요청 (네이티브/웹 공통) */
export async function requestMicPermission(): Promise<MicStatus> {
  if (typeof window === "undefined") return "unknown";

  if (isNativeRuntime()) {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const avail = await SpeechRecognition.available();
      if (!avail?.available) return "unsupported";
      const perm: any = await (SpeechRecognition as any).requestPermissions?.();
      const state = perm?.speechRecognition;
      if (!state || state === "granted") return "granted";
      return state === "prompt" || state === "prompt-with-rationale" ? "prompt" : "denied";
    } catch {
      return "denied";
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch (e: any) {
    if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") return "unsupported";
    return "denied";
  }
}

export function hasSeenMicOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return false;
  }
}

export function markMicOnboarded() {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* noop */
  }
}
