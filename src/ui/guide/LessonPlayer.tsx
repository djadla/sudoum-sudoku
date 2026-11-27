import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { LessonBoard } from './LessonBoard';
import type { Lesson } from './lessons';

/** 단계 사이 간격. 마지막 단계는 결론을 읽을 수 있도록 두 배로 머문 뒤 처음으로 돌아간다. */
export const STEP_MS = 2200;

/** 동작 줄이기를 켠 사용자에게는 자동 재생하지 않는다. (WCAG 2.2.2) */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

interface LessonPlayerProps {
  readonly lesson: Lesson;
}

/** 예제 보드와 단계 설명을 차례로 보여 주는 재생기. 재생·일시정지·이전·다음을 지원한다. */
export function LessonPlayer({ lesson }: LessonPlayerProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const total = lesson.frames.length;
  const frame = lesson.frames[step]!;

  useEffect(() => {
    if (!playing) return;
    const delay = step === total - 1 ? STEP_MS * 2 : STEP_MS;
    const timer = window.setTimeout(() => setStep((s) => (s + 1) % total), delay);
    return () => window.clearTimeout(timer);
  }, [playing, step, total]);

  // 직접 넘길 때는 자동 재생을 멈춘다. (보고 있는 단계가 갑자기 바뀌지 않게)
  const go = (next: number) => {
    setPlaying(false);
    setStep((next + total) % total);
  };

  return (
    <figure className="lesson-player">
      <LessonBoard values={lesson.values} frame={frame} />
      {/* 자동 재생 중에는 바뀔 때마다 읽지 않고, 직접 넘길 때만 읽어 준다. */}
      <figcaption className="lesson-caption" aria-live={playing ? 'off' : 'polite'}>
        <span className="lesson-step">{t('lesson.step', { n: step + 1, total })}</span>
        {t(frame.caption)}
      </figcaption>
      <div className="lesson-controls">
        <button type="button" className="tool" onClick={() => go(step - 1)} aria-label={t('lesson.previous')}>
          <span aria-hidden="true">◀</span>
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t('lesson.pause') : t('lesson.play')}
        >
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
        </button>
        <button type="button" className="tool" onClick={() => go(step + 1)} aria-label={t('lesson.next')}>
          <span aria-hidden="true">▶▶</span>
        </button>
      </div>
    </figure>
  );
}
