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
    cellGiven: 'Row {row}, column {col}: {value}, given',
    cellFilled: 'Row {row}, column {col}: {value}',
    cellEmpty: 'Row {row}, column {col}: empty',
    cellNotes: 'Row {row}, column {col}: empty, notes {notes}',
    withDuplicate: '{label}, duplicate',
  },
  controls: {
    label: 'Controls',
    digitInput: 'Enter {digit}',
    digitNote: 'Toggle note {digit}',
    erase: 'Erase',
    undo: 'Undo',
    redo: 'Redo',
    notes: 'Notes',
    on: 'On',
    off: 'Off',
    keyboardHint: 'Keyboard: 1–9 enter · N notes · Backspace erase · arrows move · Ctrl/⌘+Z undo · Ctrl/⌘+Shift+Z redo',
  },
  newGame: {
    button: 'New game',
    title: 'Choose difficulty',
    current: 'current',
    cancel: 'Cancel',
  },
  difficulty: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert',
    master: 'Master',
  },
  status: {
    solved: 'Solved! Well done.',
    generating: 'Creating a puzzle ({difficulty})…',
    failed: 'Could not create a puzzle.',
    retry: 'Try again',
  },
  puzzle: {
    meta: '{difficulty} · Seed {seed}',
  },
} as const;

export default en;
