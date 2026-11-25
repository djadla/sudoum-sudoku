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
  // Esc 한 번에는 맨 위의 화면 하나만 닫는다: 메뉴는 힌트보다 위에 뜨므로 capture 단계에서 먼저 받고,
  // preventDefault()로 처리했음을 알린다. (힌트는 이미 처리된 Esc를 무시한다, Game.tsx)
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // 모달 대화상자(도움말)는 메뉴보다 위에 있으므로 그 안의 Esc는 대화상자가 닫도록 그대로 둔다.
      // (여기서 preventDefault()하면 브라우저의 기본 대화상자 닫기까지 막힌다)
      if (event.target instanceof Element && event.target.closest('dialog')) return;
      event.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
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
