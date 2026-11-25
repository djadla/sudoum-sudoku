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
    withDuplicate: '{label}, 중복된 숫자',
  },
  controls: {
    label: '조작',
    digitInput: '{digit} 입력',
    digitNote: '메모 {digit} 켜기/끄기',
    erase: '지우기',
    undo: '실행 취소',
    redo: '다시 하기',
    notes: '메모',
    on: '켬',
    off: '끔',
    keyboardHint: '키보드: 1–9 입력 · N 메모 · Backspace 지우기 · 방향키 이동 · Ctrl/⌘+Z 실행 취소 · Ctrl/⌘+Shift+Z 다시 하기',
  },
  newGame: {
    button: '새 게임',
    title: '난이도 선택',
    current: '현재',
    cancel: '취소',
  },
  difficulty: {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
    expert: '전문가',
    master: '마스터',
  },
  status: {
    solved: '완성했습니다! 잘하셨어요.',
    generating: '퍼즐을 만드는 중입니다 ({difficulty})…',
    failed: '퍼즐을 만들지 못했습니다.',
    retry: '다시 시도',
  },
  puzzle: {
    meta: '{difficulty} · 시드 {seed}',
  },
} satisfies Messages;

export default ko;
