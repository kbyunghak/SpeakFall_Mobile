import { useEffect, useState } from "react";
import { AdSenseBanner } from "./AdSenseBanner";

interface AdBannerProps {
  className?: string;
}

/**
 * 플랫폼별 광고 배너
 * - Capacitor(네이티브) 런타임: AdMob (Phase 3에서 연동)
 * - 웹/PWA 런타임: AdSense
 */
export function AdBanner({ className = "" }: AdBannerProps) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Capacitor 런타임 감지
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    setIsNative(!!cap?.isNativePlatform?.());
  }, []);

  if (isNative) {
    // 네이티브(Amazon Fire 포함): Google 광고 SDK 미사용. 수익화 시 Amazon Mobile Ads 연동.
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 ${className}`}
        style={{ minHeight: 60 }}
      >
        광고 영역
      </div>
    );
  }

  return <AdSenseBanner className={className} />;
}
