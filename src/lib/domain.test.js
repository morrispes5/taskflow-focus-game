import { describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import {
  applySessionReward, applyTaskToggle, autoPauseFocus, beginDistraction, closeActiveFocusForReplacement, closeDistraction, createActiveFocus, filterTasks, finishFocusRun, getAgendaForDay, getAnalytics, getCalendarDays, getCountdownLabel, getDashboardStats, getDistractionSummary, getFocusActiveSeconds, getFocusControlAvailability, getFocusTimerState, getLevel, getRewardableFocusSeconds, getSessionXp, getDisplayStreak, getStreakFreezeInfo, getStreakFreezesRemaining, getTaskFocusMinutes,
  getProfileRecommendations, getTaskXp, getTodayAgenda, getUpcomingDeadlines, makeCourse, makeTask,
  getSemesterWeek, replaceActiveFocus, resumeDistraction, selectDailyMission, selectReviewTask, sortTasks, spawnNextOccurrence, todayString, updateStreak, validateCourseInput, validateProfileInput, validateTaskInput,
  validateMeetingInput, generateDefaultMeetings, getSemesterSksSummary, getCourseMeetingsProgress, getRoleTerminology
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

  it('memilih tugas selesai terbaru untuk mode review dan mengabaikan arsip', () => {
    const review = selectReviewTask([
      task({ id: 1, text: 'Selesai lama', completed: true, completedAt: 100 }),
      task({ id: 2, text: 'Selesai terbaru', completed: true, completedAt: 200 }),
      task({ id: 3, text: 'Arsip', completed: true, archived: true, completedAt: 300 })
    ]);
    expect(review).toMatchObject({ id: 2, text: 'Selesai terbaru', completed: true });
    expect(selectReviewTask([task({ completed: true, archived: true })])).toBeNull();
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

  it('menyelesaikan tugas dari Focus Run sekaligus menghentikan timer dan menyimpan recap', () => {
    const data = {
      ...createEmptyAppData(),
      tasks: [task({ id: 12, text: 'Laporan sains', priority: 'medium' })],
      activeFocus: createActiveFocus(12, 5, 100000)
    };
    const result = finishFocusRun(data, { at: 220000, completeTask: true });
    expect(result.taskCompleted).toBe(true);
    expect(result.data.tasks[0]).toMatchObject({ id: 12, completed: true, completedAt: 220000 });
    expect(result.data.activeFocus).toMatchObject({ status: 'break', activeSeconds: 120, runningSince: null, breakEndsAt: null });
    expect(result.data.sessions[0]).toMatchObject({ taskId: 12, mode: 'focus', status: 'completed', rewardApplied: true, activeSeconds: 120 });
    expect(result.data.progress.totalXp).toBe(18);
  });

  it('merekam review tanpa menambah XP atau metrik Focus Run', () => {
    const data = {
      ...createEmptyAppData(),
      tasks: [task({ id: 15, text: 'Tugas final', completed: true, completedAt: 50 })],
      progress: { ...createEmptyAppData().progress, totalXp: 42 },
      activeFocus: createActiveFocus(15, 5, 100000, 'review')
    };
    const result = finishFocusRun(data, { at: 700000 });
    expect(result).toMatchObject({ isReview: true, taskCompleted: false, sessionXp: 0 });
    expect(result.data.sessions[0]).toMatchObject({ taskId: 15, mode: 'review', status: 'completed', rewardApplied: false });
    expect(result.data.progress.totalXp).toBe(42);
    expect(getDashboardStats(data.tasks, data.progress, [
      { status: 'completed', mode: 'focus', activeSeconds: 600 },
      result.data.sessions[0]
    ]).focusMinutes).toBe(10);
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

  it('mempertahankan tugas selesai di agenda kalender dengan status completed', () => {
    const dayAgenda = getAgendaForDay([
      task({ id: 30, text: 'Matematika distrik', dueDate: '2026-08-30', completed: true, completedAt: new Date(2026, 7, 29).getTime() })
    ], [], '2026-08-30');
    expect(dayAgenda).toHaveLength(1);
    expect(dayAgenda[0]).toMatchObject({ kind: 'task', title: 'Matematika distrik', completed: true });
  });

  it('mengelola pertemuan kuliah, validasi input, progres, dan rekap SKS', () => {
    const meetings = generateDefaultMeetings('PBO', 'mahasiswa');
    expect(meetings).toHaveLength(16);
    expect(meetings[0].title).toBe('Pertemuan 1: Pengantar & Silabus');
    expect(meetings[7].title).toContain('UTS');
    expect(meetings[15].title).toContain('UAS');

    const professionalMilestones = generateDefaultMeetings('Web App', 'profesional');
    expect(professionalMilestones).toHaveLength(4);

    expect(validateMeetingInput({ number: 0 })?.field).toBe('number');
    expect(validateMeetingInput({ number: 1, driveUrl: 'ftp://invalid' })?.field).toBe('driveUrl');
    expect(validateMeetingInput({ number: 1, driveUrl: 'https://drive.google.com/slide1' })).toBeNull();
    expect(validateMeetingInput({ number: 1 }, [{ id: 99, number: 1 }])?.field).toBe('number');

    const course = makeCourse({
      name: 'PBO',
      sks: 3,
      meetings: [
        { id: 1, number: 1, title: 'Intro', completed: true },
        { id: 2, number: 2, title: 'Class & Object', completed: false }
      ]
    }, 10);
    expect(course.meetings).toHaveLength(2);
    const progress = getCourseMeetingsProgress(course);
    expect(progress.totalMeetings).toBe(2);
    expect(progress.completedMeetings).toBe(1);
    expect(progress.percentage).toBe(50);

    const sksSummary = getSemesterSksSummary([
      course,
      makeCourse({ name: 'Basis Data', sks: 4 }, 11),
      makeCourse({ name: 'Etika', sks: null }, 12)
    ]);
    expect(sksSummary.totalSks).toBe(7);
    expect(sksSummary.courseCountWithSks).toBe(2);
    expect(sksSummary.totalCourses).toBe(3);

    const academicTerms = getRoleTerminology('mahasiswa');
    expect(academicTerms.isAcademic).toBe(true);
    expect(academicTerms.meetingLabel).toBe('Pertemuan');

    const proTerms = getRoleTerminology('profesional');
    expect(proTerms.isAcademic).toBe(false);
    expect(proTerms.meetingLabel).toBe('Milestone');

    const createdTask = makeTask({ text: 'Tugas P1', courseId: 10, meetingNumber: 1, recurrence: 'weekly', dueDate: '2026-09-01' });
    expect(createdTask.meetingNumber).toBe(1);
    expect(createdTask.courseId).toBe(10);

    const recurringNext = spawnNextOccurrence(createdTask, new Date('2026-09-01').getTime());
    expect(recurringNext.meetingNumber).toBe(1);
    expect(recurringNext.courseId).toBe(10);
    expect(recurringNext.dueDate).toBe('2026-09-08');
  });
});

describe('getDisplayStreak', () => {
  const base = (overrides = {}) => ({ totalXp: 0, level: 1, currentStreak: 7, bestStreak: 9, lastActiveDate: '2026-08-30', streakFreezeMonth: '2026-08', streakFreezesUsed: 0, ...overrides });

  it('mempertahankan streak saat aktif hari ini atau kemarin', () => {
    expect(getDisplayStreak(base(), '2026-08-30')).toMatchObject({ value: 7, broken: false });
    expect(getDisplayStreak(base(), '2026-08-31')).toMatchObject({ value: 7, broken: false });
  });

  it('mempertahankan streak selama kuota freeze bulan itu masih menutupi hari terlewat', () => {
    expect(getDisplayStreak(base(), '2026-09-01')).toMatchObject({ value: 7, broken: false });
    expect(getDisplayStreak(base(), '2026-09-02')).toMatchObject({ value: 7, broken: false });
  });

  it('menandai streak putus ketika hari terlewat melebihi kuota freeze', () => {
    expect(getDisplayStreak(base(), '2026-09-14')).toMatchObject({ value: 0, broken: true, bestStreak: 9 });
  });

  it('menghormati freeze yang sudah terpakai bulan berjalan', () => {
    const used = base({ lastActiveDate: '2026-08-26', streakFreezesUsed: 3 });
    expect(getDisplayStreak(used, '2026-08-28')).toMatchObject({ value: 0, broken: true });
  });

  it('tidak menyatakan putus tanpa lastActiveDate atau tanpa streak', () => {
    expect(getDisplayStreak(base({ lastActiveDate: null }), '2026-09-14')).toMatchObject({ value: 7, broken: false });
    expect(getDisplayStreak(base({ currentStreak: 0 }), '2026-09-14')).toMatchObject({ value: 0, broken: false });
  });

  it('setuju dengan updateStreak: yang ditampilkan putus juga direset olehnya', () => {
    const stale = base();
    expect(getDisplayStreak(stale, '2026-09-14').broken).toBe(true);
    expect(updateStreak(stale, '2026-09-14').currentStreak).toBe(1);
  });
});
