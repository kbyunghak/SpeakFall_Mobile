import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.speakfall.game",
  appName: "말해봐! 영단어 구조대",
  webDir: "dist/client",
  server: {
    // Lovable preview/배포 URL을 로드하려면 아래를 활성화 (권장하지 않음)
    // url: "https://your-project.lovable.app",
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#E0F2FE",
      androidSplashResourceName: "splash",
      iosSplashResourceName: "splash",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#38BDF8",
    },
  },
};

export default config;
