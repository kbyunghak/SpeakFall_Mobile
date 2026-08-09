import { useEffect, useRef } from "react";

interface AdSenseBannerProps {
  /** Google AdSense 발행자 ID (ca-pub-XXXXXXXX) */
  client?: string;
  /** 광고 단위 슬롯 ID */
  slot?: string;
  /** 광고 형식: auto, horizontal, vertical, rectangle */
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  /** 추가 클래스 */
  className?: string;
}

const DEFAULT_CLIENT = import.meta.env["VITE_ADSENSE_CLIENT"] ?? "";
const DEFAULT_SLOT = import.meta.env["VITE_ADSENSE_SLOT"] ?? "";

/**
 * Google AdSense 배너 컴포넌트 (웹/PWA용)
 *
 * 사용 전 .env 또는 빌드 환경변수에 아래를 추가하세요:
 *   VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXX
 *   VITE_ADSENSE_SLOT=YYYYYYYYYY
 *
 * 어린이/가족 콘텐츠의 경우 AdSense 대시보드에서
 * '아동용 콘텐츠' 표시 및 맞춤형 광고 제한을 설정해야 합니다.
 */
export function AdSenseBanner({
  client = DEFAULT_CLIENT,
  slot = DEFAULT_SLOT,
  format = "auto",
  className = "",
}: AdSenseBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!client || !slot) return;
    if (initialized.current) return;
    initialized.current = true;

    // AdSense 스크립트가 없으면 주입
    if (!document.querySelector('script[data-adsense-script="true"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.crossOrigin = "anonymous";
      script.dataset["adsenseScript"] = "true";
      document.head.appendChild(script);
    }

    const win = window as unknown as {
      adsbygoogle?: unknown[];
    };

    try {
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      // AdSense가 차단되거나 로드되지 않은 경우 조용히 무시
    }
  }, [client, slot]);

  if (!client || !slot) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 ${className}`}
        style={{ minHeight: 60 }}
      >
        광고 영역 (AdSense ID 미설정)
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: "block", textAlign: "center" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
