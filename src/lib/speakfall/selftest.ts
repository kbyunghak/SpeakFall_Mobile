/**
 * 릴리즈 APK 사전 설치 테스트(스모크 테스트) 로직.
 * 마이크 / 음성 인식 / 권한 / 광고 영역 / 저장소를 자동 점검합니다.
 */

import {
  checkMicPermission,
  getPlatform,
  isNativeRuntime,
  requestMicPermission,
  settingsHint,
} from "./mic";

export type CheckStatus = "pass" | "warn" | "fail" | "running" | "idle";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** 사용자 상호작용(권한 팝업 등)이 필요한 항목 */
  interactive?: boolean;
}

export interface CheckDef {
  id: string;
  label: string;
  interactive?: boolean;
  run: () => Promise<Omit<CheckResult, "id" | "label" | "interactive">>;
}

function ok(detail: string) {
  return { status: "pass" as const, detail };
}
function warn(detail: string) {
  return { status: "warn" as const, detail };
}
function fail(detail: string) {
  return { status: "fail" as const, detail };
}

/** 실행 환경 정보 */
export function runtimeInfo() {
  const native = isNativeRuntime();
  return {
    platform: getPlatform(),
    native,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "-",
    online: typeof navigator !== "undefined" ? navigator.onLine : false,
    dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    viewport:
      typeof window !== "undefined"
        ? `${window.innerWidth}×${window.innerHeight}`
        : "-",
  };
}

export const CHECKS: CheckDef[] = [
  {
    id: "runtime",
    label: "실행 환경",
    run: async () => {
      const info = runtimeInfo();
      const kind = info.native ? `네이티브(${info.platform})` : "웹/PWA";
      return ok(`${kind} · 화면 ${info.viewport} · DPR ${info.dpr}`);
    },
  },
  {
    id: "secure",
    label: "보안 컨텍스트(HTTPS)",
    run: async () => {
      if (isNativeRuntime()) return ok("네이티브 WebView — 항상 보안 컨텍스트");
      if (window.isSecureContext) return ok("HTTPS 또는 localhost");
      return fail("HTTP 환경에서는 마이크 접근이 차단됩니다.");
    },
  },
  {
    id: "mic-permission",
    label: "마이크 권한 상태",
    run: async () => {
      const s = await checkMicPermission();
      if (s === "granted") return ok("허용됨");
      if (s === "denied") return fail(`차단됨 — ${settingsHint()}`);
      if (s === "unsupported") return fail("이 기기에서 마이크를 사용할 수 없습니다.");
      if (s === "prompt") return warn("아직 요청 전 — 아래 '권한 요청' 테스트를 실행하세요.");
      return warn("상태를 확인할 수 없음(브라우저 미지원) — 실제 녹음 테스트로 확인하세요.");
    },
  },
  {
    id: "mic-request",
    label: "마이크 권한 요청",
    interactive: true,
    run: async () => {
      const s = await requestMicPermission();
      if (s === "granted") return ok("사용자가 허용했습니다.");
      if (s === "unsupported") return fail("마이크 장치를 찾을 수 없습니다.");
      if (s === "prompt") return warn("사용자가 응답하지 않았습니다.");
      return fail(`거부됨 — ${settingsHint()}`);
    },
  },
  {
    id: "mic-input",
    label: "마이크 입력 신호",
    interactive: true,
    run: async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        return isNativeRuntime()
          ? warn("네이티브 음성 인식 플러그인을 사용합니다 — 실제 게임에서 확인하세요.")
          : fail("getUserMedia를 지원하지 않습니다.");
      }
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const peak = await measurePeak(stream, 2000);
        if (peak > 0.02) return ok(`입력 감지됨 (피크 ${(peak * 100).toFixed(0)}%)`);
        return warn(`소리가 거의 감지되지 않음 (피크 ${(peak * 100).toFixed(0)}%) — 다시 말해 보세요.`);
      } catch (e: any) {
        return fail(`녹음 실패: ${e?.name ?? "오류"}`);
      } finally {
        stream?.getTracks().forEach((t) => t.stop());
      }
    },
  },
  {
    id: "speech",
    label: "음성 인식 엔진",
    run: async () => {
      if (isNativeRuntime()) {
        try {
          const { SpeechRecognition } = await import(
            "@capacitor-community/speech-recognition"
          );
          const avail = await SpeechRecognition.available();
          return avail?.available
            ? ok("네이티브 음성 인식 사용 가능")
            : fail("기기에 음성 인식 엔진이 없습니다(Google 앱 설치 필요).");
        } catch {
          return fail("음성 인식 플러그인을 불러오지 못했습니다.");
        }
      }
      const w = window as any;
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      return SR
        ? ok("Web Speech API 사용 가능")
        : fail("이 브라우저는 Web Speech API를 지원하지 않습니다.");
    },
  },
  {
    id: "audio",
    label: "효과음 출력(Web Audio)",
    run: async () => {
      const Ctx = (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) return fail("Web Audio API 미지원 — 효과음이 재생되지 않습니다.");
      const ctx = new Ctx();
      const state = ctx.state;
      await ctx.close().catch(() => {});
      return state === "suspended"
        ? warn("사용자 조작 후 재생됩니다(정상 동작).")
        : ok("오디오 컨텍스트 생성 성공");
    },
  },
  {
    id: "storage",
    label: "진행도 저장소",
    run: async () => {
      try {
        const k = "speakfall.selftest";
        localStorage.setItem(k, "1");
        const v = localStorage.getItem(k);
        localStorage.removeItem(k);
        return v === "1" ? ok("localStorage 읽기/쓰기 정상") : fail("값을 읽지 못했습니다.");
      } catch {
        return fail("저장소 접근 불가 — 진행도가 저장되지 않습니다.");
      }
    },
  },
  {
    id: "ads",
    label: "광고 영역",
    run: async () => {
      const native = isNativeRuntime();
      const client = import.meta.env["VITE_ADSENSE_CLIENT"];
      const slot = import.meta.env["VITE_ADSENSE_SLOT"];
      const el = document.querySelector("[data-selftest-ad]");
      if (!el) return fail("광고 슬롯이 렌더링되지 않았습니다.");
      const h = (el as HTMLElement).getBoundingClientRect().height;
      if (h < 40) return warn(`광고 영역 높이가 작습니다(${Math.round(h)}px).`);
      if (native) return ok(`네이티브 광고 자리 확보됨 (${Math.round(h)}px) — Amazon Mobile Ads 연동 예정`);
      if (!client || !slot)
        return warn(`자리 확보됨(${Math.round(h)}px) — VITE_ADSENSE_CLIENT/SLOT 미설정`);
      return ok(`AdSense 설정 완료 · 영역 ${Math.round(h)}px`);
    },
  },
  {
    id: "safearea",
    label: "안전 영역(노치) 대응",
    run: async () => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;padding-top:env(safe-area-inset-top);visibility:hidden";
      document.body.appendChild(probe);
      const top = parseFloat(getComputedStyle(probe).paddingTop) || 0;
      probe.remove();
      return ok(`상단 인셋 ${Math.round(top)}px 적용`);
    },
  },
  {
    id: "network",
    label: "네트워크(오프라인 동작)",
    run: async () => {
      if (!navigator.onLine)
        return warn("오프라인 — 게임은 동작하지만 광고는 표시되지 않습니다.");
      return ok("온라인");
    },
  },
];

async function measurePeak(stream: MediaStream, ms: number): Promise<number> {
  const Ctx = (window as any).AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctx) return 0;
  const ctx = new Ctx();
  try {
    await ctx.resume().catch(() => {});
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const end = performance.now() + ms;
    let peak = 0;
    while (performance.now() < end) {
      analyser.getFloatTimeDomainData(buf);
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]!));
      await new Promise((r) => setTimeout(r, 50));
    }
    return peak;
  } finally {
    await ctx.close().catch(() => {});
  }
}

export function summarize(results: CheckResult[]) {
  return {
    pass: results.filter((r) => r.status === "pass").length,
    warn: results.filter((r) => r.status === "warn").length,
    fail: results.filter((r) => r.status === "fail").length,
  };
}

export function buildReport(results: CheckResult[]): string {
  const info = runtimeInfo();
  const s = summarize(results);
  const lines = [
    "말해봐! 영단어 구조대 — 사전 설치 테스트 리포트",
    `일시: ${new Date().toISOString()}`,
    `환경: ${info.native ? "네이티브" : "웹"} / ${info.platform} / ${info.viewport} / DPR ${info.dpr}`,
    `UA: ${info.userAgent}`,
    `결과: 통과 ${s.pass} · 주의 ${s.warn} · 실패 ${s.fail}`,
    "",
    ...results.map(
      (r) =>
        `[${r.status === "pass" ? "PASS" : r.status === "warn" ? "WARN" : r.status === "fail" ? "FAIL" : "----"}] ${r.label} — ${r.detail}`,
    ),
  ];
  return lines.join("\n");
}
