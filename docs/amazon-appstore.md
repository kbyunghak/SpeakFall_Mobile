# Amazon Appstore 출시 가이드 — 말해봐!영단어 구조대

이 저장소에는 Capacitor 기반 안드로이드 프로젝트(`android/`)가 포함되어 있습니다.
Amazon Appstore는 **APK**(또는 AAB) 업로드를 받습니다. 아래 순서대로 진행하세요.

## 1. 웹 → 네이티브 자산 빌드

```bash
npm install
npm run build:android      # MOBILE=1 vite build && cap sync android
```

- `MOBILE=1` 로 빌드하면 서버 없이 동작하는 정적 SPA 셸(`dist/client/index.html`)이 만들어집니다.
- 웹 배포용 기본 `npm run build`는 SSR 방식으로 동작합니다.

## 2. 서명 키 생성 (최초 1회)

```bash
keytool -genkey -v -keystore speakfall-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias speakfall
```

`android/keystore.properties` 파일을 만들고(절대 커밋 금지):

```
storeFile=../speakfall-release.jks
storePassword=****
keyAlias=speakfall
keyPassword=****
```

`android/app/build.gradle` 의 `android { }` 블록에 서명 설정을 추가합니다:

```gradle
def keystoreProps = new Properties()
def keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) { keystoreProps.load(new FileInputStream(keystoreFile)) }

signingConfigs {
    release {
        storeFile file(keystoreProps['storeFile'])
        storePassword keystoreProps['storePassword']
        keyAlias keystoreProps['keyAlias']
        keyPassword keystoreProps['keyPassword']
    }
}
buildTypes {
    release { signingConfig signingConfigs.release }
}
```

## 3. APK 빌드

```bash
cd android
./gradlew assembleRelease
# 결과물: android/app/build/outputs/apk/release/app-release.apk
```

Android Studio를 쓰면 `npx cap open android` → Build > Generate Signed Bundle/APK.

## 4. Amazon Appstore 등록

1. https://developer.amazon.com 계정 생성 (무료)
2. Apps & Games > Add New App > Android
3. 필수 입력
   - 앱 이름: 말해봐!영단어 구조대
   - 카테고리: Education (또는 Educational Games)
   - 연령 등급: Everyone / 어린이 대상 → **COPPA 관련 문항 정확히 응답**
   - 개인정보처리방침 URL (필수)
   - 스크린샷: 최소 3장 (1280×800 또는 세로 800×1280), 아이콘 512×512, 프로모션 이미지 1024×500
4. Binary 탭에 APK 업로드 → Fire 태블릿 지원 여부 선택
5. Submit → 심사(보통 1~3일)

## 5. Amazon 심사 시 주의사항

- **Google Play Services / AdMob 사용 금지**: Fire OS에는 Play 서비스가 없어 광고가 뜨지 않고 리젝 사유가 될 수 있습니다.
  현재 앱은 네이티브에서 광고 자리만 비워둔 상태이며, 수익화가 필요하면 **Amazon Mobile Ads SDK** 를 붙이세요.
- **음성 인식**: 안드로이드 WebView에는 Web Speech API가 없어 `@capacitor-community/speech-recognition`
  플러그인으로 대체 처리했습니다. Fire 태블릿 일부 기종에는 Google 음성 인식 서비스가 없으므로,
  인식 불가 시 앱이 안내 문구를 띄우고 Pass 버튼으로 계속 진행할 수 있어야 합니다(현재 구현됨).
- 어린이 대상 앱이므로 외부 링크·결제·개인정보 수집을 최소화하세요.
- 앱 업데이트 시 `android/app/build.gradle` 의 `versionCode` 를 반드시 1씩 올립니다.

## 6. 체크리스트

- [ ] `npm run build:android` 성공
- [ ] 서명된 release APK 생성
- [ ] 실제 기기 / Fire 태블릿에서 마이크 권한 및 게임 동작 확인
- [ ] 스크린샷·아이콘·설명 준비
- [ ] 개인정보처리방침 페이지 공개

## 사전 설치 테스트 (/selftest)

릴리즈 APK를 실제 기기(또는 Fire 태블릿)에 설치한 뒤, 앱 내에서 `/selftest`
경로를 열어 아래 항목을 자동 점검합니다.

자동 실행 항목: 실행 환경, 보안 컨텍스트, 마이크 권한 상태, 음성 인식 엔진,
효과음(Web Audio), 진행도 저장소, 광고 영역, 안전 영역(노치), 네트워크.
직접 실행 항목: 마이크 권한 요청, 마이크 입력 신호(2초간 실제 발음 측정).

제출 전 체크 순서

1. 앱 첫 실행 시 마이크 안내 시트 노출 확인
2. `/selftest` 자동 검사에 FAIL 없음
3. 권한 요청 → 입력 신호 테스트 통과(피크 감지)
4. 권한 거부 상태에서 게임 화면의 설정 안내 문구 노출 확인
5. 실제 발음으로 단어 1개 구조 성공
6. 광고 영역이 레이아웃을 가리지 않음
7. "리포트 복사" 버튼으로 결과 텍스트를 심사 기록에 보관

이 페이지는 `noindex`이며 홈 화면에 링크되어 있지 않습니다(주소 직접 입력).
