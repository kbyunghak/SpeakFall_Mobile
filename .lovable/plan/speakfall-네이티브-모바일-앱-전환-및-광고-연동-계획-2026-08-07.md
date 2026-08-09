# SpeakFall 네이티브 모바일 앱 전환 및 광고 연동 계획

## 목표
React + Vite + TanStack Start 기반 웹 게임 SpeakFall을 iOS/Android 네이티브 앱으로 전환하고, Google AdMob(앱)과 AdSense(웹) 광고를 연동한다.

## 현재 상태
- 프레임워크: TanStack Start (풀스택 React, SSR + 서버 함수)
- 빌드 타겟: Cloudflare Worker (Nitro)
- UI: Tailwind CSS v4, 모바일 퍼스트 반응형
- 광고: 미연동

## 핵심 전략
Capacitor로 기존 웹앱을 네이티브 웹뷰 앱으로 감싼다. TanStack Start의 서버 함수/SSR은 Capacitor 환경과 맞지 않으므로, 정적(static) 출력 또는 클라이언트 중심 구조로 전환한다.

## 단계별 진행

### Phase 1 — PWA 및 모바일 웹 기반 마련
1. `public/manifest.webmanifest` 작성: 앱 이름, 아이콘, theme/background color, `display: standalone`.
2. `__root.tsx`에 manifest, theme-color, apple-touch-icon 메타 태그 추가.
3. 모바일 안전영역(safe-area) 처리: 상단 상태바/하단 홈 인디케이터 대응.
4. 모바일 UX 점검: 터치 영역, 가로 모드 고정/제한, 폰트/아이콘 가독성.
5. 홈 화면 하단에 AdSense 배너 컴포넌트 추가(웹/PWA용).

### Phase 2 — Capacitor 네이티브 래퍼 구축
1. 의존성 설치: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`.
2. `capacitor.config.ts` 작성: appId, appName, webDir, server 설정.
3. Vite 빌드 출력을 Capacitor용 정적 파일로 맞춤: `ssr: false` 또는 정적 프리렌더, `outDir`을 `dist/`로 통일.
4. `capacitor init` 및 안드로이드/iOS 네이티브 프로젝트 폴더(`android/`, `ios/`) 생성.
5. 스플래시 스크린, 아이콘, 상태바 색상 등 네이티브 리소스 설정.
6. Capacitor 빌드/싱크 스크립트를 `package.json`에 추가.

### Phase 3 — 광고 연동
1. AdMob(네이티브)
   - `admob-plus-cordova` 또는 `@admob-plus/capacitor` 플러그인 설치.
   - Android: `AndroidManifest.xml`에 AdMob 앱 ID 추가.
   - iOS: `Info.plist`에 AdMob 앱 ID 추가.
   - 하단 배너 광고 컴포넌트 작성: 홈/지도/상점 화면 하단에 노출.
   - 보상형 광고(선택): 코인 부족 시 시청 보상 연동.
2. AdSense(웹/PWA 폴백)
   - 웹에서 실행될 때만 AdSense 스크립트 로드.
   - Capacitor 런타임 감지 시 AdMob 우선, 아닐 때 AdSense 노출.
3. 어린이/가족 정책 대응
   - AdMob: `tagForChildDirectedTreatment(true)`, `tagForUnderAgeOfConsent(true)` 설정.
   - AdSense: 맞춤형 광고 제한 및 아동용 콘텐츠 표시.

### Phase 4 — 스토어 제출 준비
1. 앱 아이콘, 스크린샷, 스토어 메타데이터 준비.
2. 개인정보처리방침 페이지 추가(COPPA/GDPR-K 대응).
3. Android: `build.gradle` 서명 설정, AAB 빌드.
4. iOS: Xcode에서 번들 ID, 서명, 아카이브 빌드.
5. Google Play Console / App Store Connect 제출 가이드 문서화.

## 기술적 제약 및 리스크
- TanStack Start의 서버 함수는 Capacitor 정적 빌드에서 동작하지 않을 수 있음. 진행도 저장, 상점 등은 클라이언트 로컬 스토리지 또는 REST API로 대체 필요.
- iOS 빌드는 macOS + Xcode가 필요. Lovable 에디터 안에서 직접 빌드할 수 없음.
- Android 빌드는 Windows/macOS/Linux + Android Studio 또는 Gradle 필요.
- 광고 수익화는 Google AdSense/AdMob 계정 승인 및 앱/광고 단위 ID 필요.

## 산출물
- PWA 지원 + 모바일 최적화된 웹앱
- Capacitor 기반 iOS/Android 프로젝트 scaffold
- AdMob + AdSense 연동 광고 컴포넌트
- 스토어 제출용 가이드
