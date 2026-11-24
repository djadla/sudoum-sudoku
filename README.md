# Sudoum Sudoku

서버 없이 브라우저에서 바로 즐기는 스도쿠 두뇌 게임입니다.

- 플레이: https://djadla.github.io/sudoum-sudoku/ (배포 후 열림)
- 해가 정확히 하나인 퍼즐을 난이도별로 생성합니다. ([sudoku-core](https://github.com/komeilmehranfar/sudoku-core), MIT)
- 한국어·영어를 지원합니다. (예정)

## 개발

Node 26 이상과 pnpm이 필요합니다.

```bash
pnpm install
pnpm dev        # http://localhost:5173/sudoum-sudoku/
pnpm test
pnpm build      # dist/ 생성
pnpm preview    # 빌드 결과 미리 보기
```

## 배포

`main`에 push하면 GitHub Actions가 타입 검사·테스트·빌드를 거쳐 GitHub Pages에 배포합니다. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정해야 합니다. 자세한 내용은 [ADR-0001](docs/adr/ADR-0001-deployment-method.md)을 참고하세요.

## 문서

- [요구사항 핸드오프](docs/CLAUDE_HANDOFF.md)
- [ADR 목록](docs/adr/)

## 라이선스

MIT
