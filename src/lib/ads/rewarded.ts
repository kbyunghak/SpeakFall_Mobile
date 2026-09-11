import { Capacitor } from "@capacitor/core";

const ANDROID_TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";

const ANDROID_PRODUCTION_REWARDED_ID = "ca-app-pub-3958027813411601/1402664234";

const IS_DEV = import.meta.env.DEV;

const REWARDED_ID = IS_DEV ? ANDROID_TEST_REWARDED_ID : ANDROID_PRODUCTION_REWARDED_ID;

let initializePromise: Promise<void> | null = null;

async function initializeAdMob() {
  if (!initializePromise) {
    initializePromise = import("@capacitor-community/admob").then(
      async ({ AdMob, MaxAdContentRating }) => {
        await AdMob.initialize({
          initializeForTesting: IS_DEV,
          tagForChildDirectedTreatment: true,
          tagForUnderAgeOfConsent: true,
          maxAdContentRating: MaxAdContentRating.General,
        });
      },
    );
  }

  return initializePromise;
}

export async function showRewardedUnlockAd(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (IS_DEV) {
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
    adId: REWARDED_ID,
    isTesting: IS_DEV,
    npa: true,
    immersiveMode: true,
  });

  const reward = await AdMob.showRewardVideoAd({
    adId: REWARDED_ID,
  });

  return reward.amount > 0;
}
