import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechRecognitionPlugin } from "@capacitor-community/speech-recognition";
import type { PluginListenerHandle } from "@capacitor/core";

type Result = { transcript: string; alternatives: string[]; isFinal: boolean };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Capacitor(Android/iOS) 네이티브 런타임인지 확인 */
function isNativeRuntime() {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function useSpeechRecognition(onResult: (r: Result) => void) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  // 네이티브(Android WebView는 Web Speech API 미지원) 경로용 레퍼런스
  const nativeRef = useRef<SpeechRecognitionPlugin | null>(null);
  const nativePartialListenerRef = useRef<PluginListenerHandle | null>(null);
  const nativeStateListenerRef = useRef<PluginListenerHandle | null>(null);
  const nativeRestartTimerRef = useRef<number | null>(null);
  const nativeListenRef = useRef<() => Promise<void>>(async () => {});
  const speakingTimerRef = useRef<number | null>(null);
  const isNative = useRef(false);

  const markSpeaking = useCallback(() => {
    setSpeaking(true);
    if (speakingTimerRef.current !== null) {
      window.clearTimeout(speakingTimerRef.current);
    }
    speakingTimerRef.current = window.setTimeout(() => {
      speakingTimerRef.current = null;
      setSpeaking(false);
    }, 700);
  }, []);

  useEffect(() => {
    isNative.current = isNativeRuntime();

    if (isNative.current) {
      let cancelled = false;
      (async () => {
        try {
          const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
          if (cancelled) return;
          nativeRef.current = SpeechRecognition;
          const avail = await SpeechRecognition.available();
          if (!avail?.available) {
            setSupported(false);
            return;
          }
          nativePartialListenerRef.current = await SpeechRecognition.addListener(
            "partialResults",
            (data: { matches?: string[] }) => {
              const alternatives = data?.matches?.filter(Boolean) ?? [];
              const primaryMatch = alternatives[0];
              if (!primaryMatch) return;
              markSpeaking();
              cbRef.current({ transcript: primaryMatch, alternatives, isFinal: false });
            },
          );
          nativeStateListenerRef.current = await SpeechRecognition.addListener(
            "listeningState",
            (data: { status: "started" | "stopped" }) => {
              if (data.status === "started") {
                setListening(true);
                return;
              }

              setListening(false);
              setSpeaking(false);
              if (!wantRef.current) return;
              if (nativeRestartTimerRef.current !== null) {
                window.clearTimeout(nativeRestartTimerRef.current);
              }
              nativeRestartTimerRef.current = window.setTimeout(() => {
                nativeRestartTimerRef.current = null;
                if (wantRef.current) void nativeListenRef.current();
              }, 250);
            },
          );
        } catch {
          setSupported(false);
        }
      })();
      return () => {
        cancelled = true;
        wantRef.current = false;
        if (nativeRestartTimerRef.current !== null) {
          window.clearTimeout(nativeRestartTimerRef.current);
          nativeRestartTimerRef.current = null;
        }
        if (speakingTimerRef.current !== null) {
          window.clearTimeout(speakingTimerRef.current);
          speakingTimerRef.current = null;
        }
        setSpeaking(false);
        try {
          nativePartialListenerRef.current?.remove?.();
          nativeStateListenerRef.current?.remove?.();
          nativeRef.current?.stop?.();
        } catch {
          /* noop */
        }
        nativeRef.current = null;
      };
    }

    const Ctor = getCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.onresult = (e: any) => {
      markSpeaking();
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const primaryResult = res[0];
        if (primaryResult) {
          const alternatives = Array.from({ length: res.length }, (_, index) =>
            String(res[index]?.transcript ?? ""),
          ).filter(Boolean);
          cbRef.current({
            transcript: primaryResult.transcript as string,
            alternatives,
            isFinal: res.isFinal,
          });
        }
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("마이크 권한이 필요합니다.");
        wantRef.current = false;
        setListening(false);
      } else if (e.error === "no-speech") {
        setError(null);
      }
    };
    rec.onend = () => {
      setSpeaking(false);
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          /* restart race */
        }
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    return () => {
      wantRef.current = false;
      try {
        rec.abort();
      } catch {
        /* noop */
      }
      recRef.current = null;
    };
  }, [markSpeaking]);

  /** 네이티브 인식 세션 시작(세션이 끝나면 원할 때 자동 재시작) */
  const nativeListen = useCallback(async () => {
    const SR = nativeRef.current;
    if (!SR) return;
    try {
      await SR.start({
        language: "en-US",
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      setListening(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(`음성 인식을 시작할 수 없습니다: ${message}`);
      setListening(false);
      setSpeaking(false);
    }
  }, []);
  nativeListenRef.current = nativeListen;

  const start = useCallback(() => {
    if (isNative.current) {
      const SR = nativeRef.current;
      if (!SR) return;
      wantRef.current = true;
      setError(null);
      setListening(true);
      void (async () => {
        try {
          const perm = await SR.requestPermissions();
          if (perm?.speechRecognition && perm.speechRecognition !== "granted") {
            setError("마이크 권한이 필요합니다.");
            wantRef.current = false;
            setListening(false);
            return;
          }
        } catch {
          /* 권한 API 미지원 시 그대로 진행 */
        }
        void nativeListen();
      })();
      return;
    }

    const rec = recRef.current;
    if (!rec) return;
    wantRef.current = true;
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(true);
    }
  }, [nativeListen]);

  /** Restart the engine so the accumulated transcript buffer is cleared. */
  const reset = useCallback(() => {
    if (isNative.current) {
      if (!wantRef.current) return;
      if (nativeRestartTimerRef.current !== null) {
        window.clearTimeout(nativeRestartTimerRef.current);
      }
      try {
        void nativeRef.current?.stop?.();
      } catch {
        /* noop */
      }
      setListening(false);
      // The Android plugin does not consistently emit listeningState=stopped
      // when stop() is called directly, so reset must guarantee the next session.
      nativeRestartTimerRef.current = window.setTimeout(() => {
        nativeRestartTimerRef.current = null;
        if (wantRef.current) void nativeListenRef.current();
      }, 350);
      return;
    }
    const rec = recRef.current;
    if (!rec || !wantRef.current) return;
    try {
      rec.abort(); // onend restarts it because wantRef is still true
    } catch {
      /* noop */
    }
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    setSpeaking(false);
    if (isNative.current) {
      if (nativeRestartTimerRef.current !== null) {
        window.clearTimeout(nativeRestartTimerRef.current);
        nativeRestartTimerRef.current = null;
      }
      try {
        void nativeRef.current?.stop?.();
      } catch {
        /* noop */
      }
      setListening(false);
      return;
    }
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  return { supported, listening, speaking, error, start, stop, reset };
}
