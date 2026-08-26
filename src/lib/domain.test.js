import { describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import {
  applySessionReward, applyTaskToggle, autoPauseFocus, beginDistraction, closeActiveFocusForReplacement, closeDistraction, createActiveFocus, filterTasks, getAgendaForDay, getAnalytics, getCalendarDays, getCountdownLabel, getDistractionSummary, getFocusActiveSeconds, getFocusControlAvailability, getFocusTimerState, getLevel, getRewardableFocusSeconds, getSessionXp, getStreakFreezeInfo, getStreakFreezesRemaining, getTaskFocusMinutes,
  getProfileRecommendations, getTaskXp, getTodayAgenda, getUpcomingDeadlines, makeCourse, makeTask,
  getSemesterWeek, replaceActiveFocus, resumeDistraction, selectDailyMission, sortTasks, spawnNextOccurrence, todayString, updateStreak, validateCourseInput, validateProfileInput, validateTaskInput
} from './domain.js';
import { createEmptyAppData } from './storage.js';

const task = (overrides = {}) => ({
  id: 1,
  text: 'Tugas contoh',
  completed: false,
  archived: false,
  createdAt: 100,
  updatedAt: 100,
  completedAt: null,
  dueDate: null,
  dueTime: null,
  priority: 'medium',
  category: null,
  type: 'pribadi',
  pinned: false,
  recurrence: 'none',
  subtasks: [],
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

  it('memilih tugas yang dipin sebelum terlambat', () => {
    const reference = new Date(2026, 7, 25);
    const mission = selectDailyMission([
      task({ id: 1, text: 'Terlambat', dueDate: '2026-08-24' }),
      task({ id: 2, text: 'Dipin', pinned: true, priority: 'low' })
    ], reference);
    expect(mission.text).toBe('Dipin');
  });

  it('memfilter status, prioritas, kategori, pencarian, tipe, dan mata kuliah', () => {
    const tasks = [
      task({ id: 1, text: 'Baca React', priority: 'high', category: 'Kuliah', type: 'bacaan', courseId: 8 }),
      task({ id: 2, text: 'Selesai CSS', completed: true, category: 'Proyek', type: 'proyek' }),
      task({ id: 3, text: 'Arsip lama', archived: true, type: 'tugas' })
    ];
    expect(filterTasks(tasks, { status: 'active', search: 'react' })).toHaveLength(1);
    expect(filterTasks(tasks, { priority: 'high', category: 'Kuliah' })[0].id).toBe(1);
    expect(filterTasks(tasks, { status: 'completed' })[0].id).toBe(2);
    expect(filterTasks(tasks, { type: 'bacaan', courseId: 8 })).toHaveLength(1);
    expect(filterTasks(tasks, { archived: 'archived' })).toHaveLength(1);
    expect(filterTasks(tasks, { archived: 'active' })).toHaveLength(2);
  });

  it('mengurutkan berdasarkan deadline dan prioritas', () => {
    const tasks = [task({ id: 1, priority: 'low', dueDate: '2026-08-28' }), task({ id: 2, priority: 'high', dueDate: '2026-08-27' })];
    expect(sortTasks(tasks, 'dueSoon')[0].id).toBe(2);
    expect(sortTasks(tasks, 'priority')[0].id).toBe(2);
  });

  it('menghitung reward dan level secara deterministik', () => {
    expect(getTaskXp(task({ priority: 'high' }))).toBe(15);
    expect(getTaskXp(task({ priority: 'high', type: 'ujian' }))).toBe(20);
    expect(getSessionXp(3600)).toBe(6);
    expect(getLevel(0)).toBe(1);
    expect(getLevel(100)).toBe(2);
  });

  it('mencatat distraksi tanpa menghitung waktunya sebagai fokus aktif', () => {
    const started = { taskId: 1, plannedMinutes: 50, status: 'focusing', activeSeconds: 0, runningSince: 100000, distractions: [] };
    const distracted = beginDistraction(started, 115000);
    expect(getFocusActiveSeconds(distracted, 175000)).toBe(15);
    expect(distracted.status).toBe('distracted');
    expect(getDistractionSummary(distracted, 118000)).toEqual({ count: 1, totalSeconds: 3 });
    const resumed = resumeDistraction(distracted, 118000);
    expect(resumed.status).toBe('focusing');
    expect(resumed.runningSince).toBe(118000);
    expect(getDistractionSummary(resumed, 118000)).toEqual({ count: 1, totalSeconds: 3 });
    const closed = closeDistraction(distracted, 118000);
    expect(closed.distractions[0].durationSeconds).toBe(3);
  });

  it('mengabaikan runningSince kosong agar timer tidak meloncat ke waktu tak terbatas', () => {
    expect(getFocusActiveSeconds({ status: 'focusing', activeSeconds: 42, runningSince: null }, 175000)).toBe(42);
    expect(getFocusActiveSeconds({ status: 'focusing', activeSeconds: 42, runningSince: 0 }, 175000)).toBe(42);
  });

  it('menghentikan hitungan wall-clock saat sesi di-auto-pause', () => {
    const started = createActiveFocus(1, 25, 100000);
    const paused = autoPauseFocus(started, 400000);
    expect(paused).toMatchObject({ status: 'paused', activeSeconds: 300, runningSince: null });
    expect(getFocusActiveSeconds(paused, 999999)).toBe(300);
  });

  it('memakai estimasi task dan fallback preset untuk durasi Focus Run', () => {
    expect(getTaskFocusMinutes(task({ estimateMinutes: 15 }), 50)).toBe(15);
    expect(getTaskFocusMinutes(task({ estimateMinutes: null }), 50)).toBe(50);
    expect(getTaskFocusMinutes(task({ estimateMinutes: 999 }), 25)).toBe(180);
  });

  it('membatasi waktu yang menghasilkan XP ketika activeSeconds jauh melebihi rencana', () => {
    expect(getRewardableFocusSeconds(7200, 25)).toBe(2250);
    expect(getSessionXp(7200, 25)).toBe(3);
    expect(getSessionXp(7200)).toBe(12);
    expect(applySessionReward(createEmptyAppData().progress, 7200, 25).totalXp).toBe(8);
  });

  it('mengubah countdown menjadi waktu tambahan setelah target tercapai', () => {
    const focus = { status: 'focusing', plannedMinutes: 5, activeSeconds: 300, runningSince: 100000 };
    expect(getFocusTimerState(focus, 25, 102000)).toMatchObject({
      activeSeconds: 302,
      remainingSeconds: 0,
      overtimeSeconds: 2,
      isOvertime: true
    });
  });

  it('menjaga kontrol distraksi dan selesai aktif selama status focusing', () => {
    expect(getFocusControlAvailability({ status: 'focusing' })).toMatchObject({
      canPause: true,
      canMarkDistraction: true,
      canFinish: true
    });
    expect(getFocusControlAvailability({ status: 'paused' })).toMatchObject({
      canMarkDistraction: false,
      canFinish: false,
      canResume: true
    });
  });

  it('mengarsipkan sesi lama sebagai abandoned sebelum memulai task baru', () => {
    const data = { ...createEmptyAppData(), activeFocus: createActiveFocus(1, 25, 100000) };
    const next = replaceActiveFocus(data, 2, 50, 115000);
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0]).toMatchObject({ taskId: 1, activeSeconds: 15, status: 'abandoned', rewardApplied: false });
    expect(next.activeFocus).toMatchObject({ taskId: 2, plannedMinutes: 50, status: 'focusing', runningSince: 115000 });
  });

  it('mengganti break tanpa menduplikasi sesi yang sudah selesai', () => {
    const data = { ...createEmptyAppData(), sessions: [{ id: 8, status: 'completed' }], activeFocus: { taskId: 1, status: 'break', sessionId: 8 } };
    const cleared = closeActiveFocusForReplacement(data, 120000);
    expect(cleared.sessions).toEqual(data.sessions);
    expect(cleared.activeFocus).toBeNull();
  });

  it('membawa jejak distraksi ke analitik sesi', () => {
    const analytics = getAnalytics([task()], [{ id: 8, taskId: 1, plannedMinutes: 25, activeSeconds: 900, status: 'completed', startedAt: 100, endedAt: 200, rewardApplied: true, distractions: [{ id: 150, startedAt: 150, endedAt: 270, durationSeconds: 120 }], distractionSeconds: 120 }]);
    expect(analytics.distractions).toBe(1);
    expect(analytics.distractionMinutes).toBe(2);
  });

  it('menaikkan streak untuk hari berurutan tanpa memakai freeze', () => {
    const base = { totalXp: 0, level: 1, currentStreak: 1, bestStreak: 1, lastActiveDate: '2026-08-24', streakFreezeMonth: '2026-08', streakFreezesUsed: 0 };
    const next = updateStreak(base, '2026-08-25');
    expect(next).toMatchObject({ currentStreak: 2, bestStreak: 2, streakFreezeMonth: '2026-08', streakFreezesUsed: 0 });
    expect(getStreakFreezeInfo(base, '2026-08-25')).toBeNull();
    expect(getStreakFreezesRemaining(next, '2026-08-25')).toBe(3);
  });

  it('menyelamatkan streak untuk satu hari terlewat jika freeze cukup', () => {
    const base = { totalXp: 0, level: 1, currentStreak: 4, bestStreak: 4, lastActiveDate: '2026-08-24', streakFreezeMonth: '2026-08', streakFreezesUsed: 0 };
    expect(getStreakFreezeInfo(base, '2026-08-26')).toEqual({ used: 1, remainingAfter: 2 });
    expect(updateStreak(base, '2026-08-26')).toMatchObject({ currentStreak: 5, bestStreak: 5, streakFreezeMonth: '2026-08', streakFreezesUsed: 1, lastActiveDate: '2026-08-26' });
  });

  it('mereset streak jika hari terlewat lebih banyak dari sisa freeze', () => {
    const base = { totalXp: 0, level: 1, currentStreak: 7, bestStreak: 7, lastActiveDate: '2026-08-20', streakFreezeMonth: '2026-08', streakFreezesUsed: 2 };
    expect(getStreakFreezeInfo(base, '2026-08-24')).toBeNull();
    expect(updateStreak(base, '2026-08-24')).toMatchObject({ currentStreak: 1, bestStreak: 7, streakFreezeMonth: '2026-08', streakFreezesUsed: 2, lastActiveDate: '2026-08-24' });
  });

  it('mereset kuota freeze saat masuk bulan kalender baru', () => {
    const base = { totalXp: 0, level: 1, currentStreak: 2, bestStreak: 2, lastActiveDate: '2026-08-30', streakFreezeMonth: '2026-08', streakFreezesUsed: 3 };
    expect(getStreakFreezesRemaining(base, '2026-09-02')).toBe(3);
    expect(getStreakFreezeInfo(base, '2026-09-02')).toEqual({ used: 2, remainingAfter: 1 });
    expect(updateStreak(base, '2026-09-02')).toMatchObject({ currentStreak: 3, streakFreezeMonth: '2026-09', streakFreezesUsed: 2 });
  });

  it('membatasi pemakaian maksimal tiga freeze per bulan', () => {
    let progress = { totalXp: 0, level: 1, currentStreak: 1, bestStreak: 1, lastActiveDate: '2026-08-01', streakFreezeMonth: '2026-08', streakFreezesUsed: 0 };
    progress = updateStreak(progress, '2026-08-03');
    progress = updateStreak(progress, '2026-08-05');
    progress = updateStreak(progress, '2026-08-07');
    expect(progress).toMatchObject({ currentStreak: 4, streakFreezeMonth: '2026-08', streakFreezesUsed: 3 });
    expect(getStreakFreezesRemaining(progress, '2026-08-07')).toBe(0);
    expect(getStreakFreezeInfo(progress, '2026-08-09')).toBeNull();
    expect(updateStreak(progress, '2026-08-09')).toMatchObject({ currentStreak: 1, streakFreezesUsed: 3 });
  });

  it('menambahkan catatan freeze pada toast saat task diselesaikan', () => {
    const dateKey = todayString();
    const { data: next, message } = applyTaskToggle({
      ...createEmptyAppData(),
      tasks: [task()],
      progress: { ...createEmptyAppData().progress, currentStreak: 3, bestStreak: 3, lastActiveDate: todayString(addDays(new Date(), -2)), streakFreezeMonth: dateKey.slice(0, 7), streakFreezesUsed: 0 }
    }, 1);
    expect(next.progress.streakFreezesUsed).toBe(1);
    expect(message).toContain('Streak diselamatkan pakai 1 freeze bulan ini (sisa 2).');
  });

  it('memvalidasi profil dan membuat rekomendasi offline dari tujuan', () => {
    expect(validateProfileInput({ name: '', role: 'mahasiswa', goal: 'Belajar ujian' }).field).toBe('name');
    expect(validateProfileInput({ name: 'Vio', role: 'mahasiswa', goal: '' }).field).toBe('goal');
    const recommendations = getProfileRecommendations({ name: 'Vio', role: 'mahasiswa', goal: 'Persiapan ujian akhir' });
    expect(recommendations).toHaveLength(4);
    expect(recommendations[0].category).toBe('Belajar');
    expect(recommendations[0].priority).toBe('medium');
    expect(getProfileRecommendations({ role: 'mahasiswa', goal: '' })).toEqual([]);
  });

  it('memvalidasi mata kuliah dan tugas lanjutan', () => {
    expect(validateCourseInput({ name: '' })?.field).toBe('name');
    expect(validateCourseInput({ name: 'PBO' }, [makeCourse({ name: 'PBO' }, 1)])?.field).toBe('name');
    expect(validateTaskInput({ text: 'OK', url: 'drive.google.com' })?.field).toBe('url');
    expect(validateTaskInput({ text: 'OK', dueTime: '25:00' })?.field).toBe('dueTime');
    expect(validateCourseInput({ name: 'PBO', driveUrl: 'drive.google.com/pbo' })?.field).toBe('driveUrl');
    expect(validateCourseInput({ name: 'PBO', driveUrl: 'https://drive.google.com/pbo' })).toBeNull();
  });

  it('menghitung minggu semester dari tanggal mulai tanpa menyimpannya pada tugas', () => {
    const semester = { startDate: '2026-08-24', endDate: '2026-12-20' };
    expect(getSemesterWeek('2026-08-24', semester)).toBe(1);
    expect(getSemesterWeek('2026-08-30', semester)).toBe(1);
    expect(getSemesterWeek('2026-08-31', semester)).toBe(2);
    expect(getSemesterWeek('2026-08-23', semester)).toBeNull();
  });

  it('membuat salinan tugas berulang ke tanggal berikutnya', () => {
    const next = spawnNextOccurrence(task({ dueDate: '2026-08-25', recurrence: 'weekly', text: 'Jurnal' }), 500);
    expect(next.dueDate).toBe('2026-09-01');
    expect(next.completed).toBe(false);
    expect(next.recurrence).toBe('weekly');
  });

  it('mengarsipkan tugas berulang dan menambahkan salinan saat selesai', () => {
    const { data } = applyTaskToggle({
      ...createEmptyAppData(),
      tasks: [task({ id: 11, text: 'Praktikum', recurrence: 'weekly', dueDate: '2026-08-25' })]
    }, 11, 1000);
    const original = data.tasks.find((item) => item.id === 11);
    const clone = data.tasks.find((item) => item.id !== 11);
    expect(original.completed).toBe(true);
    expect(original.archived).toBe(true);
    expect(clone.dueDate).toBe('2026-09-01');
    expect(clone.completed).toBe(false);
  });

  it('menyusun agenda hari ini dan tanda kalender', () => {
    const reference = new Date(2026, 7, 25, 9, 0, 0);
    const courses = [makeCourse({ name: 'PBO', schedule: [{ day: 2, start: '08:00', end: '10:00', room: 'Lab 1' }] }, 3)];
    const agenda = getTodayAgenda([task({ id: 4, text: 'Quiz PBO', dueDate: '2026-08-25', dueTime: '11:00', type: 'kuis' })], courses, reference);
    expect(agenda.classes).toHaveLength(1);
    expect(agenda.due).toHaveLength(1);
    expect(getUpcomingDeadlines([task({ id: 4, dueDate: '2026-08-25' })], reference, 3)).toHaveLength(1);
    expect(getCountdownLabel(task({ dueDate: '2026-08-26' }), reference)).toContain('hari');
    const days = getCalendarDays(reference);
    expect(days).toHaveLength(42);
    const dayAgenda = getAgendaForDay([task({ id: 4, text: 'Quiz PBO', dueDate: '2026-08-25', dueTime: '11:00' })], courses, '2026-08-25');
    expect(dayAgenda.some((item) => item.kind === 'class')).toBe(true);
    expect(dayAgenda.some((item) => item.kind === 'task')).toBe(true);
  });
});
