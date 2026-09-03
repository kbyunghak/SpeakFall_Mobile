import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.joygle.speakfall",
  appName: "말해봐!영단어 구조대",
  webDir: "dist/client",
  server: {
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
      style: "LIGHT",
      overlaysWebView: true,
      backgroundColor: "#00000000",
    },
  },
};

export default config;
