import { useEffect, useReducer } from 'react';
import type { Puzzle } from '../engine/puzzle';
import { createGame, gameReducer, type GameAction } from '../game/state';
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

/** 키 입력을 게임 동작으로 바꾼다. 해당하지 않는 키는 null */
export function keyToAction(key: string): GameAction | null {
  if (/^[1-9]$/.test(key)) return { type: 'input', digit: Number(key) };
  if (key === 'Backspace' || key === 'Delete' || key === '0') return { type: 'erase' };
  if (key === 'n' || key === 'N') return { type: 'toggleNoteMode' };
  const arrow = ARROWS[key];
  return arrow ? { type: 'move', ...arrow } : null;
}

/** 퍼즐 하나의 플레이 화면. 새 퍼즐은 부모가 key를 바꿔 다시 마운트한다. */
export function Game({ puzzle, onNewPuzzle }: GameProps) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(gameReducer, puzzle, createGame);
  const solved = state.status === 'solved';

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // 언어 선택기 등 다른 입력 요소에서 누른 키는 가로채지 않는다.
      if (event.target instanceof Element && event.target.closest('input, select, textarea')) return;
      const action = keyToAction(event.key);
      if (!action) return;
      event.preventDefault();
      dispatch(action);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="game">
      <Board state={state} onSelect={(index) => dispatch({ type: 'select', index })} />

      {solved && (
        <div className="solved" role="status">
          <p>{t('status.solved')}</p>
        </div>
      )}

      <Controls
        noteMode={state.noteMode}
        disabled={solved}
        onDigit={(digit) => dispatch({ type: 'input', digit })}
        onErase={() => dispatch({ type: 'erase' })}
        onToggleNoteMode={() => dispatch({ type: 'toggleNoteMode' })}
      />

      <div className="game-footer">
        <button type="button" className="tool" onClick={onNewPuzzle}>
          {t('controls.newPuzzle')}
        </button>
        <p className="hint-keys">{t('controls.keyboardHint')}</p>
      </div>
    </section>
  );
}
