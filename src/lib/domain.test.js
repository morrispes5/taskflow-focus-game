import { describe, expect, it } from 'vitest';
import {
  filterTasks, getLevel, getSessionXp, getTaskXp, selectDailyMission, sortTasks, updateStreak
} from './domain.js';

const task = (overrides = {}) => ({
  id: 1,
  text: 'Tugas contoh',
  completed: false,
  createdAt: 100,
  updatedAt: 100,
  completedAt: null,
  dueDate: null,
  priority: 'medium',
  category: null,
  ...overrides
});

describe('task domain', () => {
  it('memilih tugas terlambat sebelum tugas hari ini dan prioritas tinggi', () => {
    const reference = new Date(2026, 7, 25);
    const mission = selectDailyMission([
      task({ id: 1, text: 'High tanpa deadline', priority: 'high' }),
      task({ id: 2, text: 'Hari ini', dueDate: '2026-08-25' }),
      task({ id: 3, text: 'Terlambat', dueDate: '2026-08-24' })
    ], reference);
    expect(mission.text).toBe('Terlambat');
  });

  it('memfilter status, prioritas, kategori, dan pencarian', () => {
    const tasks = [task({ id: 1, text: 'Baca React', priority: 'high', category: 'Kuliah' }), task({ id: 2, text: 'Selesai CSS', completed: true, category: 'Proyek' })];
    expect(filterTasks(tasks, { status: 'active', search: 'react' })).toHaveLength(1);
    expect(filterTasks(tasks, { priority: 'high', category: 'Kuliah' })[0].id).toBe(1);
    expect(filterTasks(tasks, { status: 'completed' })[0].id).toBe(2);
  });

  it('mengurutkan berdasarkan deadline dan prioritas', () => {
    const tasks = [task({ id: 1, priority: 'low', dueDate: '2026-08-28' }), task({ id: 2, priority: 'high', dueDate: '2026-08-27' })];
    expect(sortTasks(tasks, 'dueSoon')[0].id).toBe(2);
    expect(sortTasks(tasks, 'priority')[0].id).toBe(2);
  });

  it('menghitung reward dan level secara deterministik', () => {
    expect(getTaskXp(task({ priority: 'high' }))).toBe(15);
    expect(getSessionXp(3600)).toBe(6);
    expect(getLevel(0)).toBe(1);
    expect(getLevel(100)).toBe(2);
  });

  it('menaikkan streak untuk hari berurutan dan reset setelah jeda', () => {
    const base = { totalXp: 0, level: 1, currentStreak: 1, bestStreak: 1, lastActiveDate: '2026-08-24' };
    expect(updateStreak(base, '2026-08-25').currentStreak).toBe(2);
    expect(updateStreak({ ...base, lastActiveDate: '2026-08-22' }, '2026-08-25').currentStreak).toBe(1);
  });
});
