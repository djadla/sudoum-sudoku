# ADR-0002: 다국어(i18n) 구조

- 상태: 승인됨 (2026-11-24)
- 날짜: 2026-11-24
- 관련 문서: [ADR-0001 배포 방식](ADR-0001-deployment-method.md), [CLAUDE_HANDOFF.md](../CLAUDE_HANDOFF.md)

## 맥락

- 화면은 **한국어·영어**를 지원하고, 이후 다른 언어를 추가할 수 있어야 한다. (2026-11-24 사용자 결정)
- 정적 사이트(GitHub Pages)이며 SPA 라우팅을 쓰지 않는다. (ADR-0001) 언어별 URL 경로(`/ko/`, `/en/`)를 두기 어렵다.
- 번역할 문자열은 많지 않다. 메뉴·버튼·가이드·완료 화면·오류 메시지에 힌트 설명까지 합쳐 대략 100~200개로 예상한다.
- 퍼즐 엔진 `sudoku-core`의 힌트(`teachHint`)는 **영어 문장**(`explanation`, `label`)과 함께 **구조화된 데이터**를 준다.
  - `strategy`: 기법 이름. `STRATEGY` 상수에 정의된 33개 값이며, 라이브러리 문서에 "이름 변경은 하위 호환을 깨는 변경"이라고 명시되어 있어 번역 키로 쓰기에 안정적이다.
  - 그 밖에 `digit`, `focusCell`, `regionCells`, `elimMarks`, `patternDigits`, `type`(배치/제거/메모 추가)이 있고, 메모 점검용 `TEACH_STRATEGY`(`Impossible Candidate`, `Missing Candidate`)가 따로 있다.
  - `label`에는 `Hidden Single (Row)`처럼 행·열·박스 구분이 붙는다.
- 번들은 현재 gzip 80KB다. 게임 규모에 비해 i18n 라이브러리가 과하게 커지지 않는 편이 좋다.

## 결정할 것

1. 번역 라이브러리
2. 언어 결정·저장 방식
3. 번역 리소스의 위치와 형식, 누락 검사
4. `sudoku-core` 힌트 문장의 번역 방식

## 1. 번역 라이브러리

### 선택지

| 선택지 | 크기(min+gzip, bundlephobia 기준) | 장점 | 단점 |
| --- | --- | --- | --- |
| **A. 직접 구현** (타입 있는 사전 + `t()` + React Context) | 1KB 안팎 | 의존성 없음. 키·파라미터 타입 검사를 TypeScript로 바로 할 수 있다. 구조가 단순해 리뷰가 쉽다 | 복수형·지연 로딩·포맷을 직접 만들어야 한다 (`Intl` API로 충분) |
| B. i18next + react-i18next | 약 26KB (16KB + 10KB) | 사실상 표준. 복수형, 지연 로딩, 언어 감지 플러그인 | 이 규모에는 기능이 과하다. 번들이 약 30% 커진다 |
| C. react-intl (FormatJS) | 약 15KB | ICU 메시지 문법, `Intl` 기반 포맷 | 이 규모에는 과하다. ICU 문법을 익혀야 한다 |
| D. Lingui | 런타임 약 2.5KB | 작다. 메시지 추출·컴파일 도구 | 컴파일용 빌드 플러그인(SWC/Babel 매크로)이 필요하다. Vite 8 / plugin-react 6 조합과의 호환성을 따로 확인해야 한다 |

### 결정: A. 직접 구현

- 두 언어, 수백 개 이하의 문자열, 서버 없는 정적 앱이라 라이브러리의 핵심 기능(지연 로딩 백엔드, 메시지 추출 도구, 번역 관리 서비스 연동)이 필요 없다.
- TypeScript만으로 "모든 언어에 모든 키가 있는지", "파라미터 이름이 맞는지"를 빌드 시점에 검사할 수 있다.
- 복수형은 `Intl.PluralRules`, 숫자·날짜·시간은 `Intl.NumberFormat`/`Intl.DateTimeFormat`/`Intl.RelativeTimeFormat`을 쓴다.
- **다시 검토할 조건**: 언어가 5개 이상으로 늘거나, 번역가·번역 관리 서비스와 협업하거나, ICU 문법이 꼭 필요한 문장이 많아지면 i18next(B)로 옮긴다. `t(key, params)` 형태를 유지하므로 옮기는 비용은 크지 않다.

## 2. 언어 결정·저장

### 결정 순서

1. URL 쿼리 `?lang=ko|en` (공유 링크에서 언어를 고정할 때)
2. 사용자가 직접 고른 언어 (`localStorage`의 `sudoum.locale`)
3. 브라우저 언어 `navigator.languages`에서 지원 언어와 처음 맞는 것 (`ko-KR` → `ko`처럼 언어 부분만 비교)
4. 기본값 `en`

- 화면에 언어 선택기를 둔다. 고르면 `localStorage`에 저장하고 바로 바뀐다. (새로고침 없음)
- 언어가 바뀌면 `<html lang>`과 `document.title`을 함께 바꾼다. 화면 낭독기가 올바른 언어로 읽게 하기 위해서다.
- 기본값을 `en`으로 하는 이유: 공개 사이트이므로 지원하지 않는 언어 사용자에게는 영어가 가장 무난하다. 한국어 브라우저는 3단계에서 `ko`로 정해진다.
- `localStorage`를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 동작해야 하므로 읽기·쓰기는 `try/catch`로 감싼다.
- 언어별 URL 경로(`/ko/`, `/en/`)는 쓰지 않는다. 정적 호스팅에서 경로를 나누려면 언어별 HTML을 따로 빌드해야 하고, 검색 노출이 이 게임의 목표가 아니기 때문이다. 필요해지면 별도 ADR로 다룬다.

## 3. 번역 리소스

### 구조

```
src/i18n/
  locales/
    en.ts        기준 언어. 이 파일의 키 구조가 Messages 타입이 된다
    ko.ts        `satisfies Messages`로 키 누락·오타를 컴파일 시점에 잡는다
  index.ts       지원 언어 목록(SUPPORTED_LOCALES), 언어 결정 로직, t() 구현
  I18nProvider.tsx  React Context, useI18n() 훅
  josa.ts        한국어 조사 선택 (예: 4를 / 3을)
```

- 리소스는 JSON 대신 **TypeScript 객체**로 둔다. 키 자동 완성과 타입 검사가 되고, 함수형 메시지(복수형, 조사 처리)도 넣을 수 있다.
- 키는 화면 단위로 묶는다. (예: `game.newGame`, `guide.rules.row`, `hint.tactic.xWing.name`)
- 파라미터는 `{name}` 형식으로 쓰고, `t()`의 두 번째 인자 타입으로 검사한다.
- 영어는 기본 언어라 앱 번들에 포함하고, 다른 언어는 동적 `import()`로 필요할 때만 불러온다. 지금은 한국어 하나뿐이라 차이가 작지만, 언어를 추가할 때 번들이 커지지 않게 처음부터 이 구조로 둔다.
- **화면 문자열은 컴포넌트에 직접 쓰지 않는다.** (`AGENTS.md` 규칙) 숫자 1~9, 기호, 게임 이름(Sudoum Sudoku)은 예외로 한다.

### 누락 검사

- 컴파일 시점: `ko.ts`가 `satisfies Messages`를 통과해야 한다.
- 테스트: 모든 언어 리소스의 키 집합이 같은지, 모든 `STRATEGY`·`TEACH_STRATEGY` 값에 번역이 있는지 검사한다.

### 새 언어 추가 절차

1. `src/i18n/locales/<언어코드>.ts`를 만들고 `satisfies Messages`를 붙인다.
2. `SUPPORTED_LOCALES`에 추가한다.
3. 필요하면 조사·어순 같은 언어별 보조 함수를 추가한다.
4. `pnpm typecheck && pnpm test`로 누락을 확인한다.

## 4. `sudoku-core` 힌트 문장의 번역

### 선택지

| 선택지 | 설명 | 평가 |
| --- | --- | --- |
| A. 영어 `explanation`을 그대로 보여 준다 | 번역 없음 | 한국어 사용자에게 맞지 않다 |
| B. 영어 문장을 패턴 매칭으로 번역한다 | 정규식으로 문장을 바꿈 | 라이브러리가 문장을 조금만 바꿔도 깨진다. 문장은 공개 API가 아니다 |
| **C. 구조화된 데이터로 각 언어 문장을 직접 만든다** | `strategy`를 키로, `digit`·`focusCell`·`regionCells` 등을 파라미터로 언어별 템플릿을 채운다 | `strategy` 값은 라이브러리가 안정성을 약속한 공개 API다. 문장 품질을 직접 관리할 수 있다 |

### 결정: C

- `src/engine/`의 힌트 래퍼가 `TeachingHint`를 언어 중립적인 `HintView`로 바꾼다.
  - 기법 ID: `STRATEGY` 값을 `TACTIC_ID` 형식의 키로 매핑 (예: `"X-Wing Strategy"` → `x-wing`)
  - 행·열·박스 구분: `regionCells`로 계산 (`label`의 영어 괄호 문자열에 기대지 않는다)
  - 숫자, 대상 칸, 근거 칸, 지울 후보 목록
- `ui`는 `HintView`를 받아 현재 언어의 템플릿으로 문장을 만든다. `engine`은 언어를 모른다. (의존 규칙 `ui → game → engine` 유지)
- 칸 위치 표기
  - 한국어: `3행 5열`, 박스는 `왼쪽 위 박스`처럼 위치 이름 또는 `1번 박스`
  - 영어: `R3C5`, `box 1`
- 기법 이름: 한국어에서는 우리말 이름 뒤에 원어를 함께 적는다. (예: `숨은 싱글 (Hidden Single)`) 스도쿠 커뮤니티에서 영어 이름이 널리 쓰여 검색·학습에 도움이 되기 때문이다.
  - X-Wing, Swordfish, Jellyfish처럼 원어가 사실상 고유명사로 통용되는 기법은 번역하지 않고 원어만 쓴다.
- 문장 템플릿 범위
  - M3에서는 실제로 자주 나오는 기본 기법(Open/Naked/Hidden Single, Pointing, Naked/Hidden Pair·Triple, X-Wing 등)과 메모 점검(`Impossible Candidate`, `Missing Candidate`)에 기법별 전용 문장을 만든다.
  - 나머지 고급 기법은 "**{기법 이름}** 기법으로 {칸}에서 후보 {숫자}를 지울 수 있습니다" 같은 **공통 템플릿**과 화면 강조로 설명한다. 영어 원문을 한국어 화면에 섞어 보여 주지 않는다.
  - 매핑에 없는 `strategy`가 오면(라이브러리 업데이트 등) 공통 템플릿을 쓰고, 개발 모드에서 경고를 남긴다. 테스트가 이 경우를 먼저 잡는다.

## 결과

- 의존성을 추가하지 않는다.
- 다음 작업에서 `src/i18n/`을 만들고, 현재 `App.tsx`의 하드코딩 문자열과 `index.html`의 `lang`·`title`·`description`을 i18n 구조로 옮긴다.
  - `index.html`의 정적 값은 JavaScript가 실행되기 전 기본값으로 영어를 둔다.
- 힌트 번역(4번)은 M3에서 구현하고, 그 전까지는 이 ADR의 구조만 따른다.
- `AGENTS.md`의 다국어 항목을 이 ADR 링크로 바꾼다.
