# ADR-0001: GitHub Pages 배포 방식

- 상태: 승인됨 (2026-11-24)
- 날짜: 2026-11-24
- 관련 문서: [CLAUDE_HANDOFF.md](../CLAUDE_HANDOFF.md)

## 맥락

- 게임은 서버 없이 동작하는 정적 웹앱으로, `https://djadla.github.io/sudoum-sudoku/` 에 GitHub Pages로 공개한다.
- 저장소는 공개(public) 저장소이며 GitHub Free 플랜을 쓴다.
- 구현 기술은 React + Vite + TypeScript + pnpm으로 잡았다. 즉 **소스를 그대로 올릴 수 없고 빌드 결과(`dist/`)를 배포해야 한다.**
- 퍼즐 엔진은 npm 패키지 `sudoku-core`(MIT)를 쓴다. 번들러 없이 쓰려면 파일을 저장소에 복사(vendoring)해야 한다.
- 모든 정적 자원은 `/sudoum-sudoku/` 하위 경로에서 열려야 한다. (리뷰 기준 3번)
- GitHub Pages의 배포 원본(Source)은 두 가지다.
  - **Deploy from a branch**: 지정한 브랜치의 **루트(`/`) 또는 `/docs` 폴더만** 고를 수 있다. `/dist` 같은 다른 폴더는 지정할 수 없다.
  - **GitHub Actions**: 워크플로가 업로드한 결과물(artifact)을 배포한다. 폴더 제약이 없고 결과물을 커밋하지 않는다.
- `docs/` 폴더는 이미 ADR·핸드오프 등 프로젝트 문서 용도로 쓴다.
- 리뷰는 Codex가 diff 단위로 한다. 빌드 결과물이 diff에 섞이면 리뷰가 어려워진다.

## 선택지

### A. GitHub Actions로 빌드 후 Pages에 직접 배포

`main`에 push하면 워크플로가 `pnpm install → 테스트 → vite build`를 실행하고, 공식 액션(`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`)으로 `dist/`를 배포한다. Pages 설정은 **Source: GitHub Actions**.

- 장점
  - 빌드 결과물을 저장소에 커밋하지 않는다. 소스와 diff가 깨끗하다.
  - 배포 전에 타입 검사·테스트를 강제할 수 있다. 실패하면 배포되지 않는다.
  - GitHub가 권장하는 현재 방식이다. 배포 이력이 Actions/Environments에 남는다.
  - 공개 저장소에서는 Actions 사용이 무료다.
- 단점
  - 워크플로 파일 관리가 필요하다. (Node·pnpm 버전, 액션 버전 고정)
  - 배포까지 1~2분 걸리고, 로컬에서 Pages 결과를 그대로 재현하려면 `vite preview`를 써야 한다.

### B. `gh-pages` 브랜치에 빌드 결과를 올리고 브랜치에서 배포

로컬(`gh-pages` npm 패키지 등) 또는 Actions에서 `dist/`를 `gh-pages` 브랜치에 커밋하고, Pages 설정은 **Deploy from a branch → gh-pages → /(root)**.

- 장점
  - 예전부터 많이 쓰던 방식이라 자료가 많다.
  - 배포된 파일이 브랜치에 그대로 남아 직접 열어 볼 수 있다.
- 단점
  - 빌드 결과물 커밋이 계속 쌓여 저장소 이력이 불어난다.
  - 로컬에서 배포하면 테스트를 건너뛰거나, 커밋 안 된 코드가 배포될 수 있다.
  - 로컬 배포는 매번 push가 필요하다. (이 프로젝트는 push마다 사용자 승인을 받는다)
  - Actions로 이 브랜치에 push하게 만들면 A보다 복잡해질 뿐 얻는 게 적다.

### C. `main` 브랜치의 `/docs` 폴더에서 배포

`vite build`의 출력 경로를 `docs/`로 바꾸고 결과물을 `main`에 커밋한다. Pages 설정은 **main → /docs**.

- 장점
  - 브랜치 하나로 끝나고 워크플로가 필요 없다.
- 단점
  - `docs/`는 이미 프로젝트 문서 폴더다. 빌드 결과물과 섞이거나 폴더 이름을 바꿔야 한다.
  - 기능 변경마다 빌드 결과물 diff가 함께 생겨 Codex 리뷰를 방해한다.
  - 빌드를 깜빡하면 소스와 배포 결과가 어긋난다.

### D. 빌드 없이 `main` 루트에서 배포 (No-build)

번들러 없이 `index.html` + 순수 ES Module(JavaScript)로 작성하고, `sudoku-core`의 `dist/index.mjs`를 `vendor/`에 복사해 import map으로 불러온다. Pages 설정은 **main → /(root)**. 핸드오프 문서에 적힌 방식이다.

- 장점
  - 가장 단순하다. 빌드·워크플로·의존성 설치가 없다.
  - 저장소 그대로가 배포 결과라 경로 문제를 눈으로 확인하기 쉽다.
- 단점
  - React·TypeScript·Vite를 쓸 수 없다. (JSDoc + `tsc --checkJs` 정도로 타입 검사를 흉내 낼 수 있다)
  - 다국어 리소스, Web Worker, 모듈 분리를 직접 관리해야 한다.
  - vendoring한 라이브러리는 버전 업데이트와 라이선스 고지를 손으로 관리해야 한다.
  - 테스트 도구(Vitest 등)를 쓰려면 결국 `package.json`과 개발 의존성이 생긴다.

### (참고) GitHub Pages 이외의 호스팅

Cloudflare Pages, Netlify, Vercel도 저장소를 연결하면 자동 빌드·배포와 PR 미리보기를 제공한다. 하지만 핸드오프에서 GitHub Pages URL(`djadla.github.io/sudoum-sudoku/`)을 목표로 정했고, 외부 서비스 계정이 하나 더 생기므로 이번 결정에서는 제외한다. PR 미리보기가 꼭 필요해지면 다시 검토한다.

## 비교 요약

| 기준                       | A. Actions | B. gh-pages | C. /docs | D. No-build |
| -------------------------- | :--------: | :---------: | :------: | :---------: |
| React + Vite + TS 사용     |     O      |      O      |    O     |      X      |
| 빌드 결과물 커밋 없음      |     O      |      X      |    X     |   (해당 없음)   |
| 배포 전 테스트 강제        |     O      |      △      |    X     |      △      |
| 리뷰 diff가 깨끗함         |     O      |      O      |    X     |      O      |
| 설정 단순함                |     △      |      △      |    O     |      O      |
| `docs/` 폴더와 충돌 없음   |     O      |      O      |    X     |      O      |

## 결정

**A. GitHub Actions로 빌드 후 Pages에 직접 배포**를 채택한다. (2026-11-24 승인)

- 다국어 구조, Web Worker 기반 퍼즐 생성, 단위 테스트를 고려하면 빌드 도구가 필요하고, 빌드가 있다면 A가 결과물 커밋 없이 가장 깔끔하다.
- 배포 전에 타입 검사와 테스트를 통과해야만 배포되므로 "스도쿠 정확성" 리뷰 기준을 자동으로 지킬 수 있다.

## 결과 (A 채택 시 할 일)

- `vite.config.ts`에 `base: '/sudoum-sudoku/'`를 지정한다. 코드 안의 자원 경로는 `import.meta.env.BASE_URL` 기준으로 만든다.
- `.github/workflows/deploy.yml`을 추가한다.
  - 트리거: `main` push, 수동 실행(`workflow_dispatch`)
  - 단계: checkout → pnpm·Node 설정 → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm test` → `pnpm build` → Pages 업로드·배포
  - 권한: `contents: read`, `pages: write`, `id-token: write`
  - 액션 버전은 추가하는 시점의 최신 메이저 버전으로 고정한다.
- 저장소에서 **Settings → Pages → Build and deployment → Source: GitHub Actions**를 선택한다. (사용자가 직접 한다)
- PR에서는 같은 워크플로의 빌드·테스트까지만 실행하고 배포는 하지 않는다.
- SPA 라우팅은 쓰지 않는다. (새로고침 시 404를 피하기 위해 화면 전환은 상태로 처리하고, 퍼즐 공유는 쿼리스트링 `?seed=`로 한다)
- `docs/CLAUDE_HANDOFF.md`의 "Deploy from a branch → main → /(root)" 안내는 이 ADR로 대체된다.
