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
    cellGiven: '{row}행 {col}열: {value}, 주어진 숫자',
    cellFilled: '{row}행 {col}열: {value}',
    cellEmpty: '{row}행 {col}열: 빈칸',
    cellNotes: '{row}행 {col}열: 빈칸, 메모 {notes}',
  },
  controls: {
    label: '조작',
    digitInput: '{digit} 입력',
    digitNote: '메모 {digit} 켜기/끄기',
    erase: '지우기',
    notes: '메모',
    on: '켬',
    off: '끔',
    newPuzzle: '새 퍼즐',
    keyboardHint: '키보드: 1–9 입력 · N 메모 · Backspace 지우기 · 방향키 이동',
  },
  status: {
    solved: '완성했습니다! 잘하셨어요.',
  },
  puzzle: {
    meta: '난이도 {level} · 시드 {seed}',
  },
} satisfies Messages;

export default ko;
