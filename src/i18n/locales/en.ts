// 기준 언어. 이 객체의 키 구조와 {파라미터} 이름이 모든 언어의 기준이 된다. (ADR-0002)
// 다른 언어 파일은 `satisfies Messages`로 키 누락을 검사한다.
const en = {
  app: {
    documentTitle: 'Sudoum Sudoku — Brain-training Sudoku',
    description: 'Play Sudoku in your browser, no sign-up required.',
  },
  language: {
    label: 'Language',
  },
  board: {
    label: 'Sudoku board',
    cellFilled: 'Row {row}, column {col}: {value}',
    cellEmpty: 'Row {row}, column {col}: empty',
  },
  puzzle: {
    meta: 'Level {level} · Seed {seed}',
  },
} as const;

export default en;
