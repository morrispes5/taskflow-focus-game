import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskRow } from './TaskRow.jsx';
import { makeTask } from '../lib/domain.js';

function renderRow(overrides = {}, props = {}) {
  const task = { ...makeTask({ text: 'Kerjakan outline presentasi', type: 'tugas' }, 1), ...overrides };
  render(<ul><TaskRow task={task} onToggle={() => {}} onEdit={() => {}} {...props} /></ul>);
  return task;
}

describe('TaskRow', () => {
  it('menampilkan judul, jenis, dan prioritas tugas', () => {
    renderRow();
    expect(screen.getByText('Kerjakan outline presentasi')).toBeInTheDocument();
    expect(screen.getByText('Tugas')).toBeInTheDocument();
    expect(screen.getByText('Sedang')).toBeInTheDocument();
  });

  it('meneruskan id tugas saat checkbox ditandai', () => {
    const onToggle = vi.fn();
    const task = renderRow({}, { onToggle });
    screen.getByRole('checkbox').click();
    expect(onToggle).toHaveBeenCalledWith(task.id);
  });

  it('menyembunyikan aksi baris pada mode compact', () => {
    renderRow({}, { compact: true });
    expect(screen.queryByTitle('Mulai Focus Run')).toBeNull();
  });
});
