import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Modal } from './ui.jsx';

describe('Modal', () => {
  it('memberi id judul yang unik per instance', () => {
    // Halaman Fokus memasang empat dialog sekaligus; id statis membuat
    // aria-labelledby menunjuk judul dialog yang salah.
    const { container } = render(<>
      <Modal open={false} onClose={() => {}} title="Dialog pertama" />
      <Modal open={false} onClose={() => {}} title="Dialog kedua" />
    </>);
    const dialogs = [...container.querySelectorAll('dialog')];
    expect(dialogs).toHaveLength(2);

    const ids = dialogs.map((dialog) => dialog.getAttribute('aria-labelledby'));
    expect(new Set(ids).size).toBe(2);
    expect(ids.every(Boolean)).toBe(true);
  });

  it('menghubungkan aria-labelledby ke judul dialognya sendiri', () => {
    const { container } = render(<>
      <Modal open={false} onClose={() => {}} title="Dialog pertama" />
      <Modal open={false} onClose={() => {}} title="Dialog kedua" />
    </>);
    const titles = [...container.querySelectorAll('dialog')].map((dialog) => {
      const id = dialog.getAttribute('aria-labelledby');
      return dialog.querySelector(`[id="${id}"]`)?.textContent;
    });
    expect(titles).toEqual(['Dialog pertama', 'Dialog kedua']);
  });
});
