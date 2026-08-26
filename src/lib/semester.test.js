import { describe, expect, it } from 'vitest';
import {
  getAnalytics, hasSemesterRange, isDateInSemester, sessionInSemester, taskInSemester, validateSemesterInput
} from './domain.js';

const semester = { name: 'Ganjil 2026', startDate: '2026-08-01', endDate: '2026-12-20' };

describe('semester interval', () => {
  it('mengenali rentang semester dan menolak tanggal di luar batas', () => {
    expect(hasSemesterRange(null)).toBe(false);
    expect(hasSemesterRange({ name: 'Ganjil' })).toBe(false);
    expect(hasSemesterRange(semester)).toBe(true);
    expect(isDateInSemester('2026-08-01', semester)).toBe(true);
    expect(isDateInSemester('2026-12-20', semester)).toBe(true);
    expect(isDateInSemester('2026-07-31', semester)).toBe(false);
    expect(isDateInSemester('2026-12-21', semester)).toBe(false);
    expect(isDateInSemester(null, semester)).toBe(false);
  });

  it('menerima batas terbuka: hanya mulai atau hanya selesai', () => {
    expect(isDateInSemester('2026-09-01', { startDate: '2026-08-01', endDate: null })).toBe(true);
    expect(isDateInSemester('2026-07-01', { startDate: '2026-08-01', endDate: null })).toBe(false);
    expect(isDateInSemester('2026-07-01', { startDate: null, endDate: '2026-08-01' })).toBe(true);
    expect(isDateInSemester('2026-09-01', { startDate: null, endDate: '2026-08-01' })).toBe(false);
  });

  it('memasukkan tugas lewat deadline, atau completedAt/createdAt jika tidak ada deadline', () => {
    expect(taskInSemester({ dueDate: '2026-09-10', createdAt: Date.parse('2025-01-01') }, semester)).toBe(true);
    expect(taskInSemester({ dueDate: '2026-01-10', createdAt: Date.parse('2026-09-01') }, semester)).toBe(false);
    expect(taskInSemester({ dueDate: null, completedAt: Date.parse('2026-09-02T10:00:00'), createdAt: Date.parse('2026-01-01') }, semester)).toBe(true);
    expect(taskInSemester({ dueDate: null, completedAt: null, createdAt: Date.parse('2026-01-02') }, semester)).toBe(false);
  });

  it('memasukkan sesi fokus berdasarkan endedAt', () => {
    expect(sessionInSemester({ startedAt: Date.parse('2026-07-01'), endedAt: Date.parse('2026-09-03T08:00:00') }, semester)).toBe(true);
    expect(sessionInSemester({ startedAt: Date.parse('2026-01-01'), endedAt: Date.parse('2026-01-02') }, semester)).toBe(false);
  });

  it('menolak tanggal selesai sebelum tanggal mulai', () => {
    expect(validateSemesterInput({ startDate: '2026-12-01', endDate: '2026-08-01' }).field).toBe('endDate');
    expect(validateSemesterInput({ startDate: '2026-08-01', endDate: '2026-12-01' })).toBeNull();
    expect(validateSemesterInput({ startDate: 'bukan-tanggal' }).field).toBe('startDate');
  });

  it('memfilter analitik ke tugas dan sesi di dalam semester', () => {
    const courses = [{ id: 1, name: 'PBO', schedule: [] }];
    const tasks = [
      { id: 1, text: 'UTS PBO', completed: true, archived: false, dueDate: '2026-09-15', completedAt: Date.parse('2026-09-14'), createdAt: Date.parse('2026-08-10'), type: 'ujian', priority: 'high', courseId: 1 },
      { id: 2, text: 'Tugas lama', completed: true, archived: false, dueDate: '2026-02-01', completedAt: Date.parse('2026-02-01'), createdAt: Date.parse('2026-01-10'), type: 'tugas', priority: 'medium', courseId: 1 }
    ];
    const sessions = [
      { id: 10, status: 'completed', activeSeconds: 1800, startedAt: Date.parse('2026-09-01'), endedAt: Date.parse('2026-09-01T10:00:00') },
      { id: 11, status: 'completed', activeSeconds: 3600, startedAt: Date.parse('2026-02-01'), endedAt: Date.parse('2026-02-01T10:00:00') }
    ];
    const all = getAnalytics(tasks, sessions, courses, new Date(2026, 8, 16), { semester, scope: 'all' });
    const scoped = getAnalytics(tasks, sessions, courses, new Date(2026, 8, 16), { semester, scope: 'semester' });
    expect(all.completed).toBe(2);
    expect(all.sessionsCompleted).toBe(2);
    expect(all.focusMinutes).toBe(90);
    expect(scoped.scope).toBe('semester');
    expect(scoped.completed).toBe(1);
    expect(scoped.active).toBe(0);
    expect(scoped.sessionsCompleted).toBe(1);
    expect(scoped.focusMinutes).toBe(30);
    expect(scoped.courses[0].count).toBe(1);
    expect(getAnalytics(tasks, sessions, courses, new Date(), { semester: null, scope: 'semester' }).completed).toBe(2);
  });
});
