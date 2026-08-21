# SpeakFall 발음 판정 정책

## 문서 상태

- 상태: 승인된 목표 사양
- 구현 상태: 적용 전
- 적용 대상: 게임의 `자연스럽게`, `꼼꼼하게` 발음 모드
- 관련 구조: `docs/SPEECH_ARCHITECTURE.md`

이 문서는 STT가 반환한 문자열 후보를 SpeakFall 게임에서 어떻게 성공 또는 실패로 판정할지 정의합니다. 현재 기본 음성 엔진은 실제 음소를 직접 채점하지 않으므로, 이 정책에서 말하는 발음 판정은 STT 후보 문자열을 이용한 게임 판정입니다.

## 목표

- `자연스럽게`: STT의 후보 순위 오차를 흡수해 게임 흐름을 유지합니다.
- `꼼꼼하게`: STT의 첫 번째 후보만 사용해 단어 구별을 엄격하게 확인합니다.
- Alternative Exact Match를 단어별 목록으로 작성하지 않습니다.
- 동음어와 자연스러운 별칭은 목적에 따라 분리해 관리합니다.
- 최소대립쌍은 자연스럽게 모드의 Alternative Exact Match를 방해하지 않아야 합니다.
- 사용자가 말한 뒤에는 성공, 발음 불일치, 인식 결과 없음 중 하나로 반드시 응답합니다.

## 용어

| 용어          | 설명                                              |
| ------------- | ------------------------------------------------- |
| Target        | 화면에 표시된 목표 단어                           |
| Top           | STT가 가장 가능성이 높다고 반환한 첫 번째 후보    |
| Alternatives  | STT가 함께 반환한 나머지 후보. 최대 4개를 사용    |
| Exact Match   | 정규화 후 철자가 완전히 같은 경우                 |
| Homophone     | 발음은 같지만 철자가 다른 단어                    |
| Natural Alias | 자연스럽게 모드에서만 허용하는 제한적인 인식 변형 |
| Minimal Pair  | 한 음소 차이로 의미가 달라지는 단어 쌍            |

## 입력 데이터

판정기는 공통 `SpeechResult`를 입력으로 받습니다.

```ts
type SpeechResult = {
  transcript: string;
  alternatives: Array<{
    transcript: string;
    confidence?: number;
  }>;
  engine: SpeechEngineId;
  timestamp: number;
  isFinal: boolean;
  confidence?: number;
  pronunciation?: PronunciationAssessment;
};
```

판정 후보는 매 발화마다 STT 결과에서 자동으로 생성합니다.

```ts
const candidates = [result.transcript, ...result.alternatives.map(({ transcript }) => transcript)]
  .map(normalize)
  .filter(Boolean)
  .slice(0, 5);
```

따라서 다음과 같은 단어별 Alternative 목록은 만들지 않습니다.

```ts
// 금지: STT가 매번 생성해야 할 후보를 정적 데이터로 관리하지 않습니다.
const alternativesByWord = {
  bed: ["bad", "bet"],
  ship: ["sheep", "chip"],
};
```

## 문자열 정규화

Exact Match 전에 다음 정규화를 적용합니다.

1. 소문자로 변환
2. 영문자와 공백 이외 문자 제거
3. 연속 공백을 하나로 변환
4. 앞뒤 공백 제거

문장 속에 목표 단어가 포함된 것만으로는 Exact Match로 처리하지 않습니다.

```text
Target: cut
Candidate: I said cut
결과: Exact Match 아님
```

## 허용 단어 데이터

허용 표현은 역할에 따라 분리합니다.

```ts
type WordItem = {
  word: string;
  homophones?: string[];
  naturalAliases?: string[];
};
```

### Homophone

음성만으로 구별할 수 없는 안전한 동음어입니다. 두 모드 모두에서 인정하되 모드별 후보 범위는 다릅니다.

```ts
{
  word: "bear",
  homophones: ["bare"],
}

{
  word: "rain",
  homophones: ["reign"],
}
```

중복 등록을 줄이려면 중앙 그룹으로 관리할 수 있습니다.

```ts
const HOMOPHONE_GROUPS = [
  ["bear", "bare"],
  ["rain", "reign"],
  ["sea", "see"],
  ["sun", "son"],
] as const;
```

### Natural Alias

동음어는 아니지만 Android STT의 반복적인 인식 특성을 보정하기 위해 자연스럽게 모드에서만 허용하는 표현입니다.

```ts
{
  word: "pig",
  naturalAliases: ["pick"],
}
```

`pig → pick`처럼 실제 자음이 다른 표현은 Homophone으로 등록하지 않습니다. Natural Alias는 실기기 로그에서 반복적으로 필요성이 확인된 경우에만 추가합니다.

### 기존 accepts 마이그레이션

기존 `accepts`는 모든 모드에서 인정되므로 의미가 불명확합니다. 각 항목을 검수해 다음 중 하나로 이동합니다.

- 실제 동음어: `homophones`
- 자연스럽게 전용 STT 보정: `naturalAliases`
- 근거가 부족한 항목: 제거

## 자연스럽게 모드

### 목적

STT가 Top 순위를 잘못 정했더라도 후보 안에서 목표 발음을 감지했다면 게임 흐름을 유지합니다.

### 판정 순서

1. Top Target Exact Match면 성공
2. Alternative Target Exact Match면 성공
3. Top Homophone Exact Match면 성공
4. Alternative Homophone Exact Match면 성공
5. Top Natural Alias Exact Match면 성공
6. Alternative Natural Alias Exact Match면 성공
7. 위 일치가 없고 Top이 Target의 Minimal Pair 상대이면 실패
8. 안전한 문자열 유사도를 계산해 트랙별 임계값 이상이면 성공
9. 나머지는 실패

핵심 규칙은 Exact Match를 Minimal Pair 검사보다 먼저 실행하는 것입니다.

```text
Target: bed
Top: bad
Alternatives: bed, bet

결과: 성공
이유: Alternative Target Exact Match
```

```text
Target: bed
Top: bad
Alternatives: bet, bat

결과: 실패
이유: Exact Match가 없고 bad–bed Minimal Pair 충돌
```

```text
Target: ship
Top: sheep
Alternatives: ship, chip

결과: 성공
이유: Alternative Target Exact Match
```

```text
Target: ship
Top: sheep
Alternatives: chip, cheap

결과: 실패
이유: Exact Match가 없고 ship–sheep Minimal Pair 충돌
```

### 문자열 유사도

Exact Match, Homophone, Natural Alias와 Minimal Pair 검사를 통과한 뒤 마지막 보조 수단으로만 사용합니다.

```ts
similarity = 1 - editDistance(target, candidate) / Math.max(target.length, candidate.length);
```

현재 트랙별 목표 임계값은 다음과 같습니다.

| 트랙      | Leniency | 통과 임계값 |
| --------- | -------: | ----------: |
| 기초      |     0.00 |        0.75 |
| 초등      |     0.02 |        0.73 |
| 중등      |     0.04 |        0.71 |
| 고등      |     0.07 |        0.68 |
| 비즈니스  |     0.09 |        0.66 |
| 전문/학술 |     0.11 |        0.64 |

Minimal Pair 상대 단어가 높은 철자 유사도만으로 성공하지 않도록 유사도 후보에서 제외합니다.

## 꼼꼼하게 모드

### 목적

STT가 가장 가능성이 높다고 판단한 결과를 기준으로 단어 구별을 엄격하게 확인합니다.

### 판정 순서

1. Top이 Target과 Exact Match면 성공
2. Top이 안전한 Homophone과 Exact Match면 성공
3. 나머지는 실패

다음 항목은 사용하지 않습니다.

- Alternative Target Exact Match
- Natural Alias
- 문자열 유사도
- 트랙별 Leniency

```text
Target: bed
Top: bad
Alternatives: bed, bet

결과: 실패
이유: Top이 Target과 일치하지 않음
```

```text
Target: bear
Top: bare
Alternatives: bear, beer

결과: 성공
이유: Top이 안전한 Homophone과 일치
```

동음어는 음성만으로 구별할 수 없으므로 꼼꼼하게 모드에서도 인정합니다. 꼼꼼함은 Top 후보만 사용하고 Natural Alias와 유사도를 허용하지 않는 방식으로 확보합니다.

내부 `normal` strictness는 기존 데이터 및 진단 호환을 위한 레거시 전용 값입니다. 현재 사용자 UI에서는 `easy`를 자연스럽게, `hard`를 꼼꼼하게로 사용하며 `normal`을 선택지로 노출하지 않습니다.

## Minimal Pair 관리

Minimal Pair는 실제 두 단어의 쌍으로 관리합니다.

```ts
const MINIMAL_PAIRS = {
  "r / l": [["right", "light"]],
  "f / p": [["fan", "pan"]],
  "v / b": [["vest", "best"]],
  "θ / s": [["think", "sink"]],
  "ɪ / iː": [["ship", "sheep"]],
  "æ / ɛ": [["bad", "bed"]],
  "ʊ / uː": [["full", "fool"]],
};
```

`full /fʊl/–fool /fuːl/`은 `ɪ / iː`가 아니라 `ʊ / uː` 대비로 관리합니다.

## 발화 상태와 사용자 피드백

마이크 권한 상태와 음성 처리 상태를 분리합니다.

```ts
type SpeechUiState =
  "ready" | "listening" | "checking" | "success" | "mismatch" | "no-speech" | "error";
```

| 상태        | 권장 색상      | 문구                                |
| ----------- | -------------- | ----------------------------------- |
| `ready`     | 파랑           | 말해보세요                          |
| `listening` | 빨강           | 듣고 있어요…                        |
| `checking`  | 노랑           | 발음을 확인하고 있어요…             |
| `success`   | 초록           | 성공! 친구를 구했어요               |
| `mismatch`  | 주황           | “bad”로 들었어요. 다시 말해보세요   |
| `no-speech` | 회색 또는 보라 | 잘 못 알아들었어요. 다시 말해주세요 |
| `error`     | 진한 빨강      | 마이크 연결을 확인해주세요          |

모든 발화는 다음 중 하나로 종료되어야 합니다.

```text
인식 결과 있음 + 성공 판정 → success
인식 결과 있음 + 실패 판정 → mismatch
인식 결과 없음 + 세션 종료/시간 초과 → no-speech
음성 엔진 오류 → error
```

`listening`은 음성 인식 세션이 켜져 있다는 의미이고, 실제 사용자가 말하고 있다는 의미와 구분합니다. 실제 transcript 또는 음성 활동이 감지되면 `checking`으로 이동합니다.

## 발화 타이밍

현재 동작을 기준으로 다음 값을 유지하고 실제 기기에서 조정합니다.

| 항목                           |               기준값 |
| ------------------------------ | -------------------: |
| Android/Web 후보 수            |             최대 5개 |
| Android partial 종료 판정      | 마지막 결과 후 600ms |
| 음성 세션 reset guard          |                200ms |
| Android 자동 재시작            |     stopped 후 250ms |
| Android 명시적 reset 후 재시작 |                350ms |
| 일반 성공 후 다음 단어         |                700ms |

무음 상태는 transcript가 없는 별도 타임아웃으로 처리하며 `mismatch`와 구분합니다.

## 판정 결과 코드

로그와 테스트에서 판정 이유를 구분할 수 있도록 다음 결과 코드를 권장합니다.

```ts
type PronunciationReason =
  | "top-exact"
  | "alternative-exact"
  | "top-homophone"
  | "alternative-homophone"
  | "top-natural-alias"
  | "alternative-natural-alias"
  | "similar"
  | "minimal-pair-conflict"
  | "no-match";
```

`no-speech`와 `engine-error`는 evaluator의 판정 사유가 아니라 Phase 2의 음성 UI 상태로 별도 관리합니다.

## 테스트 기준

### 자연스럽게

- Top이 틀려도 Alternative에 Target이 있으면 성공
- Top이 Minimal Pair 상대여도 Alternative에 Target이 있으면 성공
- Target이 후보에 없고 Top이 Minimal Pair 상대이면 실패
- Homophone이 Top 또는 Alternative에 있으면 성공
- Natural Alias가 Top 또는 Alternative에 있으면 성공
- Minimal Pair 상대가 문자열 유사도만으로 성공하지 않음

### 꼼꼼하게

- Top Target Exact Match만 성공
- Alternative에만 Target이 있으면 실패
- Top Homophone은 성공
- Alternative Homophone은 실패
- Natural Alias는 실패
- 문자열 유사도만으로 성공하지 않음

### 상태 피드백

- 마이크 준비, 듣는 중, 판별 중 상태가 시각적으로 구분됨
- 성공 시 초록 상태와 성공 피드백이 표시됨
- transcript가 있는 실패는 인식된 단어를 표시함
- transcript가 없는 발화는 “잘 못 알아들었어요”를 표시함
- 오류 후 다음 음성 세션을 재시도할 수 있음
- 같은 발화가 성공과 실패로 중복 처리되지 않음

### Android 실기기 필수 사례

다음 Target을 각각 정상 발음과 의도적 오발음으로 반복 테스트합니다.

```text
bed / bad
ship / sheep
full / fool
bear / bare
rain / reign
right / light
fan / pan
vest / best
think / sink
```

각 테스트에서 `[STT Debug]`와 `[STT Evaluation]` 로그의 Top, Alternatives, 판정 이유를 함께 기록합니다.

## 구현 대상 파일

| 파일                                            | 변경 내용                                  |
| ----------------------------------------------- | ------------------------------------------ |
| `src/lib/speech/pronunciationEvaluator.ts`      | 판정 순서 및 결과 코드 변경                |
| `src/lib/speech/minimalPairs.ts`                | 누락된 최소대립쌍 추가                     |
| `src/data/words/types.ts`                       | Homophone/Natural Alias 타입 분리          |
| `src/data/words/*.ts`                           | 안전한 허용 표현 등록 및 기존 accepts 검수 |
| `src/hooks/useSpeechRecognition.ts`             | 무음/엔진 상태 전달 보강                   |
| `src/components/speakfall/SpeakFallGame.tsx`    | 상태별 마이크 색상과 피드백 표시           |
| `src/lib/speech/pronunciationEvaluator.test.ts` | 두 모드 정책 단위 테스트 추가              |

## 비목표

이 정책 변경에서는 다음을 구현하지 않습니다.

- 실제 음성 파형 기반 음소 분석
- IPA 자체를 이용한 자동 정답 판정
- Whisper 또는 Azure Pronunciation Assessment 연결
- 마이크 하드웨어 감도 증폭
- 신뢰도 하나만으로 성공 또는 실패 결정

전문 발음 평가 엔진이 추가되기 전까지 IPA는 목표와 인식 단어를 설명하는 피드백 정보로만 사용합니다.

## 구현 순서

1. 판정 이유 타입 확장
2. Homophone과 Natural Alias 데이터 구조 분리
3. 자연스럽게 모드의 Alternative Exact 우선 적용
4. 꼼꼼하게 모드의 Top Exact/Homophone 적용
5. Minimal Pair와 문자열 유사도 순서 정리
6. `full–fool` 등 누락 쌍 보완
7. 단위 테스트 작성
8. 음성 UI 상태 모델 추가
9. 무음 피드백 추가
10. Android 실기기 로그 검증

실기기 로그가 필요한 결과는 코드 변경만으로 완료 처리하지 않습니다.
