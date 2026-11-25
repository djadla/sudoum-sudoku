import { useEffect, useId, useRef, useState } from 'react';
import { DIFFICULTY_IDS, type DifficultyId } from '../engine/difficulty';
import { useI18n } from '../i18n/I18nProvider';

interface NewGameMenuProps {
  /** 현재(또는 마지막으로 고른) 난이도 */
  readonly current: DifficultyId;
  readonly onNewGame: (difficulty: DifficultyId) => void;
}

/**
 * "새 게임" 버튼과 난이도 목록.
 * 진행 중인 게임을 실수로 잃지 않도록, 난이도를 바꾸는 것만으로는 새 게임을 시작하지 않고
 * 버튼을 눌러 목록을 연 뒤 난이도를 골라야 시작한다.
 */
export function NewGameMenu({ current, onNewGame }: NewGameMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 열면 현재 난이도 버튼으로 포커스를 옮기고, Esc로 닫으면 "새 게임" 버튼으로 돌려준다.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="new-game">
      <button
        ref={toggleRef}
        type="button"
        className="tool compact"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {t('newGame.button')}
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="new-game-panel"
          role="group"
          aria-labelledby={titleId}
          data-no-game-keys
        >
          <p id={titleId} className="new-game-title">
            {t('newGame.title')}
          </p>
          <div className="difficulty-list">
            {DIFFICULTY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className="tool"
                aria-current={id === current}
                onClick={() => {
                  setOpen(false);
                  onNewGame(id);
                }}
              >
                {t(`difficulty.${id}`)}
                {id === current && <span className="tool-state"> · {t('newGame.current')}</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tool new-game-cancel"
            onClick={() => {
              setOpen(false);
              toggleRef.current?.focus();
            }}
          >
            {t('newGame.cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
