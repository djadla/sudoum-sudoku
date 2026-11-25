# AGENTS.md

이 파일은 이 저장소에서 작업하는 **모든 AI 에이전트**(Claude Code, Codex, Gemini CLI, Cursor, Copilot 등)가 따르는 공통 정책이다.

- 공통 규칙은 **이 파일에만** 작성한다. 에이전트별 파일(`CLAUDE.md` 등)에는 이 파일을 불러오는 내용과 해당 도구 전용 설정만 둔다.
- 에이전트별 파일의 내용이 이 파일과 충돌하면 **이 파일을 따른다.**

## 1. 기본 원칙

- 모든 답변, 코드 주석, 문서, 커밋 메시지는 **한국어**로 작성한다. (식별자·로그 키·설정 키는 영어)
- 요청받은 범위만 수정한다. 관련 없는 리팩터링이나 포맷 변경은 하지 않는다.
- 주변 코드의 스타일(네이밍, 주석 밀도, 패턴)을 따른다.
- 결정이 필요한 사항(버전, 라이브러리, 외부 서비스, 데이터 구조 변경 등)은 추천안과 근거를 함께 제시하고 사용자 확인을 받는다. 중요한 결정은 `docs/adr/`에 ADR로 남긴다.
  - ADR 파일명: `ADR-<4자리 번호>-<영문 kebab-case 제목>.md` (예: `ADR-0001-deployment-method.md`). 번호는 이어서 매기고 재사용하지 않는다.
- 확인하지 않은 내용을 사실처럼 말하지 않는다. 빌드·테스트 결과는 실제로 실행한 결과만 보고한다.

## 2. Git 규칙

- 커밋은 사용자가 요청했을 때만 한다. `main`에 직접 커밋하지 않고 작업 브랜치를 만든다.
- 푸시는 **실행할 때마다 직전에 사용자 승인**을 받는다. 커밋 승인이나 이전 푸시 승인은 다음 푸시의 승인이 아니다.
- 커밋 메시지는 한국어 한 줄 요약 위주로 쓴다. (예: `메모 모드에 키보드 단축키 추가`)
- `git push --force`, `git reset --hard`, 브랜치 삭제 등 되돌리기 어려운 작업은 사전 승인 없이 하지 않는다.
- PR 머지 방식
  - 기본은 **리베이스 머지**(`gh pr merge --rebase`)다. 브랜치의 커밋을 그대로 `main` 위에 얹어 이력을 한 줄로 유지한다.
  - 커밋 이력이 너무 많으면 **스쿼시 머지**(`gh pr merge --squash`)를 쓴다. PR 하나가 커밋 하나가 되어 `git revert` 한 번으로 되돌릴 수 있다.
  - 일반 머지(머지 커밋, `--merge`)는 특별한 경우가 아니면 쓰지 않는다.
  - 머지 전에 PR의 커밋 수와 내용을 보고 어느 방식을 쓸지 사용자에게 알린다.

## 3. 프로젝트 개요

- 목적: 서버 없이 브라우저에서 동작하는 스도쿠 두뇌 게임. GitHub Pages(`https://djadla.github.io/sudoum-sudoku/`)로 공개한다.
- 기술: React, Vite, TypeScript, pnpm, Vitest. 퍼즐 엔진은 `sudoku-core`(MIT).
- 배포: GitHub Actions가 빌드·테스트 후 Pages에 배포한다. 빌드 결과물(`dist/`)은 커밋하지 않는다. ([ADR-0001](docs/adr/ADR-0001-deployment-method.md))
- 화면 언어: 한국어·영어를 지원하고, 다른 언어를 추가할 수 있는 구조로 만든다. 화면 문자열을 컴포넌트에 직접 쓰지 않는다. ([ADR-0002](docs/adr/ADR-0002-i18n-structure.md))
- 요구사항 원문: [docs/CLAUDE_HANDOFF.md](docs/CLAUDE_HANDOFF.md)

### 디렉터리 구조

```
src/
  engine/   퍼즐 생성·검증·힌트. sudoku-core를 감싸는 계층. React에 의존하지 않는다
  game/     게임 상태 (보드, 메모, 선택 칸, 실행 취소·다시 하기)
  ui/       화면 컴포넌트
  workers/  퍼즐 생성·힌트 계산 Web Worker
docs/
  adr/      아키텍처 결정 기록
.github/workflows/deploy.yml  CI 및 Pages 배포
```

### 의존 규칙

- 의존 방향: `ui → game → engine`. `engine`은 React·DOM·브라우저 저장소에 의존하지 않는다.
- 퍼즐 생성·힌트 계산(`sudoku-core`)은 `src/workers/`를 거쳐 Web Worker에서 한다. 힌트 정책은 [ADR-0003](docs/adr/ADR-0003-hint-policy.md)을 따른다. `ui`·`game`은 `engine/puzzle.ts`·`engine/hint.ts`를 직접 import하지 않고 타입·상수는 `engine/types.ts`·`engine/hintTypes.ts`에서 가져온다. (메인 번들에 생성 코드가 들어가 화면이 멈추거나 번들이 커지는 것을 막기 위해서다)
- 서버·런타임 백엔드 의존을 추가하지 않는다.
- 정적 자원 경로는 하드코딩하지 않고 Vite의 `base`(`/sudoum-sudoku/`)와 `import.meta.env.BASE_URL`을 따른다.
- 외부 코드를 복사하거나 패키지를 추가할 때는 라이선스 호환성(MIT 등)을 확인하고 사용자에게 알린다.

## 4. 명령

```bash
pnpm install      # 의존성 설치
pnpm dev          # 개발 서버 (http://localhost:5173/sudoum-sudoku/)
pnpm typecheck    # 타입 검사
pnpm test         # 단위 테스트
pnpm build        # 프로덕션 빌드 (dist/)
pnpm preview      # 빌드 결과를 Pages와 같은 경로로 미리 보기
```

변경을 마치면 `pnpm typecheck && pnpm test && pnpm build`를 실행하고 결과를 보고한다.

## 5. 리뷰 (Codex)

Codex는 구현 담당이 아니라 리뷰어다. 리뷰를 요청할 때는 관련 diff·파일·저장소 상태를 함께 제공한다. 리뷰 기준:

1. 스도쿠 정확성: 올바른 배치 판정, 유일해 보장, 올바른 힌트 동작
2. 플레이 경험: 명확한 메모 모드, 선택 칸 상태, 충돌 표시, 접근성, 모바일 레이아웃
3. 배포: 모든 자원이 `/sudoum-sudoku/` 기본 경로에서 열리는지
4. 코드 건강성: 단순한 구조, 불필요한 런타임·서버 의존 없음, 복사·설치한 코드의 라이선스 호환성
