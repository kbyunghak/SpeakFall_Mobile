import { Capacitor } from "@capacitor/core";

const ANDROID_TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";
let initializePromise: Promise<void> | null = null;

async function initializeAdMob() {
  if (!initializePromise) {
    initializePromise = import("@capacitor-community/admob").then(
      async ({ AdMob, MaxAdContentRating }) => {
        await AdMob.initialize({
          initializeForTesting: true,
          tagForChildDirectedTreatment: true,
          tagForUnderAgeOfConsent: true,
          maxAdContentRating: MaxAdContentRating.General,
        });
      },
    );
  }
  return initializePromise;
}

/** 테스트 보상형 광고를 끝까지 시청해 보상을 받은 경우에만 true를 반환합니다. */
export async function showRewardedUnlockAd(): Promise<boolean> {
  // 로컬 웹 개발에서는 광고를 모의 성공 처리
  if (!Capacitor.isNativePlatform()) {
    if (import.meta.env.DEV) {
      console.info("[DEV] Rewarded ad simulated on web");
      await new Promise((resolve) => setTimeout(resolve, 500));
      return true;
    }

    return false;
  }

  if (Capacitor.getPlatform() !== "android") {
    return false;
  }

  await initializeAdMob();

  const { AdMob } = await import("@capacitor-community/admob");

  await AdMob.prepareRewardVideoAd({
    adId: ANDROID_TEST_REWARDED_ID,
    isTesting: true,
    npa: true,
    immersiveMode: true,
  });

  const reward = await AdMob.showRewardVideoAd({
    adId: ANDROID_TEST_REWARDED_ID,
  });

  return reward.amount > 0;
}
