// @vitest-environment happy-dom
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../test/render';
import { GuideDialog } from './GuideDialog';

/** 실제 부모처럼 open 상태를 갖고, 닫힐 때 onClose가 몇 번 불리는지 센다. */
function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        parent close
      </button>
      <GuideDialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    </>
  );
}

function setup() {
  const onClose = vi.fn();
  renderWithI18n(<Harness onClose={onClose} />);
  const dialog = screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;
  return { onClose, dialog, user: userEvent.setup() };
}

afterEach(cleanup);

describe('GuideDialog', () => {
  it('닫기 버튼으로 닫으면 onClose를 정확히 한 번 부른다', async () => {
    const { onClose, dialog, user } = setup();
    expect(dialog.open).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // happy-dom은 Esc로 <dialog>를 닫지 않으므로 close 이벤트 경로만 검증한다.
  // 실제 Esc 키 동작은 Chrome(CDP)에서 수동으로 확인했다.
  it('대화상자가 버튼 밖의 방법으로 닫혀도(close 이벤트) onClose를 정확히 한 번 부른다', () => {
    const { onClose, dialog } = setup();
    act(() => dialog.close());
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('부모가 open을 false로 바꾸면 대화상자를 닫는다', async () => {
    const { onClose, dialog, user } = setup();
    // 모달 바깥 버튼은 사용자가 누를 수 없으므로 상태 변경만 흉내 낸다.
    await act(async () => screen.getByRole('button', { name: 'parent close', hidden: true }).click());
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();

    // 다시 열 수 있다.
    await user.click(screen.getByRole('button', { name: 'open', hidden: true }));
    expect(dialog.open).toBe(true);
  });
});
