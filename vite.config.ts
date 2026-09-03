import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { generateArchiveManifest } from "./scripts/generateArchiveManifest.ts";

// 개발 서버와 모든 빌드에서 실제 Archive JSON 개수를 목록에 자동 반영합니다.
generateArchiveManifest();

// MOBILE=1 로 빌드하면 Capacitor(Android/iOS)용 정적 SPA 셸(dist/client/index.html)을 생성합니다.
// 웹 배포(기본 빌드)는 기존 SSR 동작을 그대로 유지합니다.
const isMobileBuild = process.env["MOBILE"] === "1";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
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
    }),
    ...(!isMobileBuild ? [nitro()] : []),
    viteReact(),
  ],
});
