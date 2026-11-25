import { useI18n } from '../i18n/I18nProvider';

interface ControlsProps {
  readonly noteMode: boolean;
  readonly disabled: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onDigit: (digit: number) => void;
  readonly onErase: () => void;
  readonly onToggleNoteMode: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Controls(props: ControlsProps) {
  const { noteMode, disabled, canUndo, canRedo, onDigit, onErase, onToggleNoteMode, onUndo, onRedo } = props;
  const { t } = useI18n();

  return (
    <div className="controls" role="group" aria-label={t('controls.label')}>
      <div className="tools">
        <button type="button" className="tool" onClick={onUndo} disabled={disabled || !canUndo}>
          {t('controls.undo')}
        </button>
        <button type="button" className="tool" onClick={onRedo} disabled={disabled || !canRedo}>
          {t('controls.redo')}
        </button>
        <button type="button" className="tool" onClick={onErase} disabled={disabled}>
          {t('controls.erase')}
        </button>
        <button
          type="button"
          className="tool"
          aria-pressed={noteMode}
          onClick={onToggleNoteMode}
          disabled={disabled}
        >
          {t('controls.notes')} <span className="tool-state">{noteMode ? t('controls.on') : t('controls.off')}</span>
        </button>
      </div>
      <div className="number-pad" data-note-mode={noteMode || undefined}>
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="digit"
            aria-label={noteMode ? t('controls.digitNote', { digit }) : t('controls.digitInput', { digit })}
            onClick={() => onDigit(digit)}
            disabled={disabled}
          >
            {digit}
          </button>
        ))}
      </div>
    </div>
  );
}
