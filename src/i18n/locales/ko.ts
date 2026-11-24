import type { Messages } from '../messages';

const ko = {
  app: {
    documentTitle: 'Sudoum Sudoku — 두뇌 스도쿠',
    description: '가입 없이 브라우저에서 바로 즐기는 스도쿠 두뇌 게임',
  },
  language: {
    label: '언어',
  },
  board: {
    label: '스도쿠 보드',
    cellFilled: '{row}행 {col}열: {value}',
    cellEmpty: '{row}행 {col}열: 빈칸',
  },
  puzzle: {
    meta: '난이도 {level} · 시드 {seed}',
  },
} satisfies Messages;

export default ko;
