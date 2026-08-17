// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { generateArchiveManifest } from "./scripts/generateArchiveManifest";

// 개발 서버와 모든 빌드에서 실제 Archive JSON 개수를 목록에 자동 반영합니다.
generateArchiveManifest();

// MOBILE=1 로 빌드하면 Capacitor(Android/iOS)용 정적 SPA 셸(dist/client/index.html)을 생성합니다.
// 웹 배포(기본 빌드)는 기존 SSR 동작을 그대로 유지합니다.
const isMobileBuild = process.env["MOBILE"] === "1";

export default defineConfig({
  // 모바일 빌드에서는 Cloudflare 서버 번들 대신 정적 SPA 셸만 생성합니다.
  ...(isMobileBuild ? { nitro: false as const } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    ...(isMobileBuild ? {} : { server: { entry: "server" } }),
    ...(isMobileBuild
      ? {
          spa: {
            enabled: true,
            prerender: {
              enabled: true,
              outputPath: "/index.html",
              crawlLinks: false,
            },
          },
        }
      : {}),
  },
});
