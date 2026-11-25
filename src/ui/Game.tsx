import { useEffect, useReducer } from 'react';
import type { Puzzle } from '../engine/puzzle';
import { canRedo, canUndo, createGame, gameReducer, type GameAction } from '../game/state';
import { useI18n } from '../i18n/I18nProvider';
import { Board } from './Board';
import { Controls } from './Controls';

interface GameProps {
  readonly puzzle: Puzzle;
  readonly onNewPuzzle: () => void;
}

const ARROWS: Record<string, { dRow: number; dCol: number }> = {
  ArrowUp: { dRow: -1, dCol: 0 },
  ArrowDown: { dRow: 1, dCol: 0 },
  ArrowLeft: { dRow: 0, dCol: -1 },
  ArrowRight: { dRow: 0, dCol: 1 },
};

/** 수정키 없이 누른 키를 게임 동작으로 바꾼다. 해당하지 않는 키는 null */
export function keyToAction(key: string): GameAction | null {
  if (/^[1-9]$/.test(key)) return { type: 'input', digit: Number(key) };
  if (key === 'Backspace' || key === 'Delete' || key === '0') return { type: 'erase' };
  if (key === 'n' || key === 'N') return { type: 'toggleNoteMode' };
  const arrow = ARROWS[key];
  return arrow ? { type: 'move', ...arrow } : null;
}

type KeyInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/**
 * 키 이벤트를 게임 동작으로 바꾼다.
 * Ctrl/⌘ 조합은 실행 취소(Z)·다시 하기(Shift+Z, Y)만 받고, 나머지는 브라우저 단축키로 남긴다.
 */
export function eventToAction(event: KeyInput): GameAction | null {
  if (event.altKey) return null;
  if (event.ctrlKey || event.metaKey) {
    const key = event.key.toLowerCase();
    if (key === 'z') return { type: event.shiftKey ? 'redo' : 'undo' };
    if (key === 'y' && !event.shiftKey) return { type: 'redo' };
    return null;
  }
  return keyToAction(event.key);
}

/** 퍼즐 하나의 플레이 화면. 새 퍼즐은 부모가 key를 바꿔 다시 마운트한다. */
export function Game({ puzzle, onNewPuzzle }: GameProps) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(gameReducer, puzzle, createGame);
  const solved = state.status === 'solved';

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // 언어 선택기 등 다른 입력 요소에서 누른 키는 가로채지 않는다.
      if (event.target instanceof Element && event.target.closest('input, select, textarea')) return;
      const action = eventToAction(event);
      if (!action) return;
      event.preventDefault();
      dispatch(action);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="game">
      {/* 좁은 화면에서도 보드·조작부가 한 화면에 들어가도록 새 퍼즐 버튼을 보드 위 한 줄에 둔다. */}
      <div className="game-bar">
        <p className="meta">{t('puzzle.meta', { level: puzzle.difficulty, seed: puzzle.seed })}</p>
        <button type="button" className="tool compact" onClick={onNewPuzzle}>
          {t('controls.newPuzzle')}
        </button>
      </div>

      <Board state={state} onSelect={(index) => dispatch({ type: 'select', index })} />

      {solved && (
        <div className="solved" role="status">
          <p>{t('status.solved')}</p>
        </div>
      )}

      <Controls
        noteMode={state.noteMode}
        disabled={solved}
        canUndo={canUndo(state)}
        canRedo={canRedo(state)}
        onDigit={(digit) => dispatch({ type: 'input', digit })}
        onErase={() => dispatch({ type: 'erase' })}
        onToggleNoteMode={() => dispatch({ type: 'toggleNoteMode' })}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
      />

      <p className="hint-keys">{t('controls.keyboardHint')}</p>
    </section>
  );
}
