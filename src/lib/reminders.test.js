import { describe, expect, it } from 'vitest';
import { getDueReminders, markRemindersNotified, reminderKey } from './reminders.js';

const task = (overrides = {}) => ({
  id: 1,
  text: 'Kumpulkan laporan',
  completed: false,
  archived: false,
  dueDate: '2026-08-26',
  dueTime: '09:00',
  reminderOffsetHours: 24,
  ...overrides
});

describe('reminders', () => {
  it('menampilkan tugas yang jatuh tempo dalam jendela pengingat', () => {
    const reference = new Date(2026, 7, 26, 8, 0, 0);
    const items = getDueReminders([task()], { notifiedKeys: [] }, reference);
    expect(items).toHaveLength(1);
    expect(items[0].overdue).toBe(false);
  });

  it('menandai overdue dan melewati yang sudah dinotifikasi', () => {
    const reference = new Date(2026, 7, 26, 10, 0, 0);
    const key = reminderKey(task(), '2026-08-26');
    const items = getDueReminders([task()], { notifiedKeys: [key] }, reference);
    expect(items[0].overdue).toBe(true);
    expect(items[0].alreadyNotified).toBe(true);
  });

  it('menyimpan kunci notifikasi tanpa menumpuk tanpa batas', () => {
    const progress = markRemindersNotified({ notifiedKeys: Array.from({ length: 200 }, (_, index) => `old-${index}`) }, ['new-1']);
    expect(progress.notifiedKeys).toHaveLength(200);
    expect(progress.notifiedKeys.at(-1)).toBe('new-1');
  });

  it('mengabaikan tugas selesai, terarsip, atau tanpa deadline', () => {
    const reference = new Date(2026, 7, 26, 8, 0, 0);
    expect(getDueReminders([task({ completed: true })], { notifiedKeys: [] }, reference)).toEqual([]);
    expect(getDueReminders([task({ archived: true })], { notifiedKeys: [] }, reference)).toEqual([]);
    expect(getDueReminders([task({ dueDate: null })], { notifiedKeys: [] }, reference)).toEqual([]);
  });

  it('menghormati offset pengingat dan jendela default 24 jam', () => {
    const early = new Date(2026, 7, 25, 7, 0, 0);
    expect(getDueReminders([task({ reminderOffsetHours: 1 })], { notifiedKeys: [] }, early)).toEqual([]);
    const oneHourBefore = new Date(2026, 7, 26, 8, 10, 0);
    expect(getDueReminders([task({ reminderOffsetHours: 1 })], { notifiedKeys: [] }, oneHourBefore)).toHaveLength(1);
    const defaultWindow = new Date(2026, 7, 25, 10, 0, 0);
    expect(getDueReminders([task({ reminderOffsetHours: null })], { notifiedKeys: [] }, defaultWindow)).toHaveLength(1);
    const tooEarlyForDefault = new Date(2026, 7, 24, 8, 0, 0);
    expect(getDueReminders([task({ reminderOffsetHours: null })], { notifiedKeys: [] }, tooEarlyForDefault)).toEqual([]);
  });
});
