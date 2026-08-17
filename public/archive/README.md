# SpeakFall Archive Sets

기본 게임 단어는 앱 번들에 그대로 유지합니다. 이 폴더는 사용자가 선택해서 받는 추가 단어
Set 전용입니다.

- `manifest.json`: 실제 JSON 파일을 기준으로 개발 서버/빌드 시작 시 자동 생성되는 Set 목록
- `{track}/*.json`: Set별 최대 100단어
- 트랙: `basic`, `elementary`, `middle`, `high`, `biz`, `pro`

Set 파일은 해당 트랙 폴더에 추가하기만 하면 됩니다. 개발 서버 또는 빌드를 시작할 때 파일
개수와 `setId`, `version`, `wordCount`, `file`이 `manifest.json`에 자동 반영됩니다. 실제
운영에서는 `VITE_ARCHIVE_BASE_URL`을 CDN 주소로 설정할 수 있습니다.
