import { useI18n } from '../i18n/I18nProvider';

interface ControlsProps {
  readonly noteMode: boolean;
  readonly showCandidates: boolean;
  readonly disabled: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onDigit: (digit: number) => void;
  readonly onErase: () => void;
  readonly onToggleNoteMode: () => void;
  readonly onToggleCandidates: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Controls(props: ControlsProps) {
  const { noteMode, showCandidates, disabled, canUndo, canRedo } = props;
  const { onDigit, onErase, onToggleNoteMode, onToggleCandidates, onUndo, onRedo } = props;
  const { t } = useI18n();

  return (
    <div className="controls" role="group" aria-label={t('controls.label')}>
      <div className="tools">
        {/* 좁은 화면에서는 기호(↶ ↷)만 보이고, 이름은 화면 낭독기가 읽는다. (styles.css .tool-label) */}
        <button type="button" className="tool" onClick={onUndo} disabled={disabled || !canUndo}>
          <span className="tool-icon" aria-hidden="true">
            ↶
          </span>
          <span className="tool-label">{t('controls.undo')}</span>
        </button>
        <button type="button" className="tool" onClick={onRedo} disabled={disabled || !canRedo}>
          <span className="tool-icon" aria-hidden="true">
            ↷
          </span>
          <span className="tool-label">{t('controls.redo')}</span>
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
        <button
          type="button"
          className="tool"
          aria-pressed={showCandidates}
          onClick={onToggleCandidates}
          disabled={disabled}
        >
          {/* 좁은 화면에서는 짧은 이름만 보인다. 보이는 이름과 화면 낭독기가 읽는 이름이 같도록
              (WCAG 2.5.3 Label in Name) 한쪽을 display: none으로 완전히 숨긴다. */}
          {/* 공백은 이름 글자 안에 붙인다. 공백만 있는 텍스트 노드가 display: none 요소 옆에 있으면
              Chrome 접근성 트리에서 빠져 "CandidatesOff"처럼 붙어 읽힌다. (메모 버튼의 "Notes "와 같은 방식) */}
          <span className="label-wide">{`${t('controls.candidates')} `}</span>
          <span className="label-narrow">{`${t('controls.candidatesShort')} `}</span>
          <span className="tool-state">{showCandidates ? t('controls.on') : t('controls.off')}</span>
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
