# 추가 단어 Archive Set 운영 가이드

## 원칙

- 현재 앱에 포함된 기본 단어와 진행도는 변경하지 않는다.
- 추가 단어는 트랙별 `Set 1`, `Set 2` 순서로 제공한다.
- 한 Set은 최대 100단어이며 Lv.1~10 정보를 함께 가진다.
- 기본 단어를 모두 모으지 않아도 추가 Set을 받을 수 있다.
- 보상형 광고가 끝나면 Set 사용 권한을 먼저 저장하고 파일을 내려받는다.
- 다운로드 실패 시 이미 얻은 사용 권한을 유지해 광고 없이 다시 시도한다.
- 실제 단어 데이터는 기기 캐시에, 잠금 해제/다운로드 상태는 진행도에 저장한다.

## 파일 구조

```text
public/archive/
├─ manifest.json
├─ basic/
│  ├─ set-1.json
│  └─ set-2.json
├─ elementary/
├─ middle/
├─ high/
├─ biz/
└─ pro/
```

## Manifest 예시

```json
{
  "schemaVersion": 1,
  "tracks": {
    "basic": [
      {
        "setId": 1,
        "title": "기초 영단어 Set 1",
        "wordCount": 100,
        "version": 1,
        "file": "basic/set-1.json"
      }
    ],
    "elementary": [],
    "middle": [],
    "high": [],
    "biz": [],
    "pro": []
  }
}
```

## Set 파일 예시

```json
{
  "schemaVersion": 1,
  "track": "basic",
  "setId": 1,
  "title": "기초 영단어 Set 1",
  "range": { "from": 1, "to": 100 },
  "version": 1,
  "words": [{ "word": "apple", "ipa": "/ˈæpəl/", "meaning": "사과", "level": 1 }]
}
```

`wordCount`는 `words` 배열 길이와 정확히 같아야 합니다. 단어는 한 Set 안에서 중복될 수
없고, `level`은 1~10만 허용됩니다.

## 운영 배포

기본값은 앱에 포함된 `/archive`를 읽습니다. 앱 업데이트 없이 Set을 추가하려면 같은 구조를
HTTPS 서버나 CDN에 올리고 빌드 시 다음 환경 변수를 설정합니다.

```text
VITE_ARCHIVE_BASE_URL=https://example.com/speakfall/archive
```

Manifest 또는 Set 검증에 실패한 파일은 저장하지 않습니다. Set 내용을 바꾸면 `version`을
올려 새 빌드를 배포하거나 향후 갱신 로직을 추가해야 합니다.
