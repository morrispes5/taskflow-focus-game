import { addDays, differenceInCalendarDays, endOfDay, format, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import {
  normalizeTask, PRIORITY_LABELS, PROFILE_ROLE_LABELS, PROFILE_ROLES, MAX_PROFILE_GOAL_LENGTH, MAX_PROFILE_NAME_LENGTH,
  MAX_COURSE_NAME, MAX_COURSES, MAX_NOTES_LENGTH, MAX_SUBTASKS, MAX_TASK_LENGTH, TASK_TYPES, TASK_TYPE_LABELS, COURSE_COLORS,
  isTimeString
} from './storage.js';

export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function todayString(date = new Date()) { return format(date, 'yyyy-MM-dd'); }

export function parseDateString(value) { return parseISO(`${value}T00:00:00`); }

export function formatDate(value) {
  if (!value) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const date = parseDateString(value);
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export function formatTime(value) {
  return value && /^\d{2}:\d{2}$/.test(value) ? value : '';
}

export function dueTimestamp(task, reference = new Date()) {
  if (!task.dueDate) return null;
  const time = formatTime(task.dueTime) || '23:59';
  return parseISO(`${task.dueDate}T${time}:00`).getTime() || parseDateString(task.dueDate).getTime();
}

export function isOverdue(task, reference = new Date()) {
  if (task.completed || task.archived || !task.dueDate) return false;
  const due = dueTimestamp(task, reference);
  return due !== null && due < reference.getTime();
}

export function getDueInfo(task, reference = new Date()) {
  if (!task.dueDate) return { label: 'Tanpa deadline', tone: 'muted' };
  const today = todayString(reference);
  const tomorrow = todayString(addDays(reference, 1));
  const timeLabel = formatTime(task.dueTime) ? ` · ${task.dueTime}` : '';
  if (!task.completed && isOverdue(task, reference)) return { label: `Terlambat · ${formatDate(task.dueDate)}${timeLabel}`, tone: 'danger' };
  if (task.dueDate === today) return { label: task.completed ? `Deadline hari ini${timeLabel}` : `Hari ini${timeLabel}`, tone: 'focus' };
  if (task.dueDate === tomorrow) return { label: `Besok${timeLabel}`, tone: 'muted' };
  return { label: `${formatDate(task.dueDate)}${timeLabel}`, tone: 'muted' };
}

export function getCountdownLabel(task, reference = new Date()) {
  if (!task.dueDate) return 'Tanpa deadline';
  const due = dueTimestamp(task, reference);
  const diffMs = due - reference.getTime();
  if (diffMs < 0) return 'Sudah lewat';
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'Kurang dari 1 jam';
  if (hours < 24) return `${hours} jam lagi`;
  const days = Math.ceil(hours / 24);
  return `${days} hari lagi`;
}

export function getTaskXp(task) {
  const typeBonus = task.type === 'ujian' ? 5 : task.type === 'kuis' || task.type === 'proyek' ? 2 : 0;
  return 10 + (task.priority === 'high' ? 5 : task.priority === 'medium' ? 3 : 0) + typeBonus;
}

export function getSessionXp(activeSeconds) { return Math.floor(Math.max(0, activeSeconds) / 600); }

export function getLevel(totalXp) { return Math.floor(Math.max(0, totalXp) / 100) + 1; }

export function getNextLevelXp(totalXp) { return getLevel(totalXp) * 100; }

export function getWeekStart(reference = new Date()) { return startOfWeek(reference, { weekStartsOn: 1 }); }

export function isCompletedThisWeek(task, reference = new Date()) {
  return Boolean(task.completedAt && isWithinInterval(new Date(task.completedAt), { start: getWeekStart(reference), end: endOfDay(reference) }));
}

export function getCourseById(courses, courseId) {
  return courses.find((course) => course.id === courseId) || null;
}

export function getTaskLabel(task, courses = []) {
  const course = task.courseId ? getCourseById(courses, task.courseId) : null;
  return course?.name || task.category || null;
}

export function getSubtaskProgress(task) {
  const total = task.subtasks?.length || 0;
  if (!total) return { total: 0, done: 0, ratio: 0 };
  const done = task.subtasks.filter((item) => item.completed).length;
  return { total, done, ratio: done / total };
}

export function visibleTasks(tasks, { includeArchived = false } = {}) {
  return includeArchived ? tasks : tasks.filter((task) => !task.archived);
}

export function sortTasks(tasks, mode = 'newest') {
  return [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    if (mode === 'dueSoon') {
      const aDue = dueTimestamp(a) ?? Number.MAX_SAFE_INTEGER;
      const bDue = dueTimestamp(b) ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue || Number(b.completed) - Number(a.completed) || b.createdAt - a.createdAt;
    }
    if (mode === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
    return b.createdAt - a.createdAt;
  });
}

export function filterTasks(tasks, { status = 'all', priority = 'all', category = 'all', search = '', courseId = 'all', type = 'all', archived = 'active' } = {}) {
  const query = search.trim().toLowerCase();
  return tasks.filter((task) => {
    const archiveMatch = archived === 'all' || (archived === 'archived' ? task.archived : !task.archived);
    const statusMatch = status === 'all' || (status === 'active' ? !task.completed : task.completed);
    const priorityMatch = priority === 'all' || task.priority === priority;
    const categoryMatch = category === 'all' || (task.category || 'Tanpa kategori') === category;
    const courseMatch = courseId === 'all' || (courseId === 'none' ? !task.courseId : task.courseId === Number(courseId));
    const typeMatch = type === 'all' || task.type === type;
    const searchMatch = !query || `${task.text} ${task.category || ''} ${task.notes || ''}`.toLowerCase().includes(query);
    return archiveMatch && statusMatch && priorityMatch && categoryMatch && courseMatch && typeMatch && searchMatch;
  });
}

export function selectDailyMission(tasks, reference = new Date()) {
  const active = tasks.filter((task) => !task.completed && !task.archived);
  return [...active].sort((a, b) => {
    const rank = (task) => {
      if (task.pinned) return -1;
      if (isOverdue(task, reference)) return 0;
      if (task.dueDate === todayString(reference)) return 1;
      if (task.dueDate) return 2;
      if (task.priority === 'high') return 3;
      return 4;
    };
    const rankDifference = rank(a) - rank(b);
    if (rankDifference) return rankDifference;
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
  })[0] || null;
}

export function getDashboardStats(tasks, progress, sessions, reference = new Date()) {
  const live = visibleTasks(tasks);
  const active = live.filter((task) => !task.completed);
  const completed = live.filter((task) => task.completed);
  const today = todayString(reference);
  return {
    total: live.length,
    active: active.length,
    dueToday: active.filter((task) => task.dueDate === today).length,
    overdue: active.filter((task) => isOverdue(task, reference)).length,
    completedWeek: completed.filter((task) => isCompletedThisWeek(task, reference)).length,
    focusMinutes: Math.floor(sessions.filter((session) => session.status === 'completed').reduce((sum, session) => sum + session.activeSeconds, 0) / 60),
    xp: progress.totalXp,
    level: progress.level,
    streak: progress.currentStreak
  };
}

export function getUpcomingDeadlines(tasks, reference = new Date(), limit = 3) {
  return sortTasks(
    visibleTasks(tasks).filter((task) => !task.completed && task.dueDate),
    'dueSoon'
  ).slice(0, limit);
}

export function getTodayAgenda(tasks, courses = [], reference = new Date()) {
  const dateKey = todayString(reference);
  const weekday = reference.getDay();
  const classes = courses.flatMap((course) => course.schedule.filter((slot) => slot.day === weekday).map((slot) => ({
    kind: 'class',
    id: `${course.id}-${slot.start}`,
    title: course.name,
    time: `${slot.start}–${slot.end}`,
    room: slot.room,
    color: course.color
  })));
  const due = visibleTasks(tasks).filter((task) => !task.completed && task.dueDate === dateKey).map((task) => ({
    kind: 'task',
    id: task.id,
    title: task.text,
    time: formatTime(task.dueTime) || 'Deadline',
    type: task.type,
    task
  }));
  const overdue = visibleTasks(tasks).filter((task) => isOverdue(task, reference) && task.dueDate !== dateKey).map((task) => ({
    kind: 'overdue',
    id: task.id,
    title: task.text,
    time: getDueInfo(task, reference).label,
    type: task.type,
    task
  }));
  return { dateKey, classes, due, overdue };
}

export function getCalendarDays(reference = new Date()) {
  const monthStart = startOfMonth(reference);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      key: todayString(date),
      inMonth: date.getMonth() === reference.getMonth(),
      isToday: todayString(date) === todayString(reference)
    };
  });
}

export function getCalendarMarks(tasks, courses, dayKey) {
  const live = visibleTasks(tasks);
  const weekday = parseDateString(dayKey).getDay();
  const deadlineCount = live.filter((task) => task.dueDate === dayKey).length;
  const examCount = live.filter((task) => task.dueDate === dayKey && (task.type === 'ujian' || task.type === 'kuis')).length;
  const classCount = courses.reduce((sum, course) => sum + course.schedule.filter((slot) => slot.day === weekday).length, 0);
  return { deadlineCount, examCount, classCount };
}

export function getAgendaForDay(tasks, courses, dayKey) {
  const weekday = parseDateString(dayKey).getDay();
  const classes = courses.flatMap((course) => course.schedule.filter((slot) => slot.day === weekday).map((slot) => ({
    kind: 'class',
    sort: slot.start,
    title: course.name,
    meta: `${slot.start}–${slot.end}${slot.room ? ` · ${slot.room}` : ''}`,
    color: course.color
  })));
  const deadlines = visibleTasks(tasks).filter((task) => task.dueDate === dayKey).map((task) => ({
    kind: 'task',
    sort: formatTime(task.dueTime) || '99:99',
    title: task.text,
    meta: `${TASK_TYPE_LABELS[task.type] || 'Tugas'}${task.dueTime ? ` · ${task.dueTime}` : ''}`,
    task,
    completed: task.completed
  }));
  return [...classes, ...deadlines].sort((a, b) => a.sort.localeCompare(b.sort));
}

export function getCourseProgress(courses, tasks) {
  return courses.map((course) => {
    const related = visibleTasks(tasks).filter((task) => task.courseId === course.id);
    const completed = related.filter((task) => task.completed).length;
    return { course, total: related.length, completed, active: related.length - completed };
  });
}

export function getAnalytics(tasks, sessions, courses = [], reference = new Date()) {
  const live = visibleTasks(tasks);
  const completed = live.filter((task) => task.completed);
  const withDeadline = completed.filter((task) => task.dueDate && task.completedAt);
  const onTime = withDeadline.filter((task) => task.completedAt <= (dueTimestamp({ ...task, dueTime: task.dueTime || '23:59' }) ?? endOfDay(parseDateString(task.dueDate)).getTime()));
  const categoryMap = new Map();
  live.forEach((task) => { const key = getTaskLabel(task, courses) || 'Tanpa kategori'; categoryMap.set(key, (categoryMap.get(key) || 0) + 1); });
  const priority = ['high', 'medium', 'low'].map((key) => ({ label: PRIORITY_LABELS[key], key, count: live.filter((task) => task.priority === key).length })).filter((item) => item.count);
  const types = TASK_TYPES.map((key) => ({ label: TASK_TYPE_LABELS[key], key, count: live.filter((task) => task.type === key).length })).filter((item) => item.count);
  const focusMinutes = Math.floor(sessions.filter((session) => session.status === 'completed').reduce((sum, session) => sum + session.activeSeconds, 0) / 60);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfWeek(reference, { weekStartsOn: 1 }), index);
    const key = todayString(date);
    return { key, label: format(date, 'EEE'), completed: completed.filter((task) => task.completedAt && todayString(new Date(task.completedAt)) === key).length, focus: Math.floor(sessions.filter((session) => session.status === 'completed' && session.endedAt && todayString(new Date(session.endedAt)) === key).reduce((sum, session) => sum + session.activeSeconds, 0) / 60) };
  });
  return {
    completionRate: live.length ? Math.round((completed.length / live.length) * 100) : 0,
    completed: completed.length,
    active: live.length - completed.length,
    overdue: live.filter((task) => isOverdue(task, reference)).length,
    onTimeRate: withDeadline.length ? Math.round((onTime.length / withDeadline.length) * 100) : 0,
    onTimeCount: onTime.length,
    withDeadline: live.filter((task) => task.dueDate).length,
    focusMinutes,
    sessionsCompleted: sessions.filter((session) => session.status === 'completed').length,
    category: [...categoryMap.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
    courses: getCourseProgress(courses, live).filter((item) => item.total).map((item) => ({ label: item.course.name, count: item.total, completed: item.completed })),
    types,
    priority,
    days
  };
}

export function validateTaskInput(input) {
  const text = String(input.text ?? '').trim();
  const category = String(input.category ?? '').trim();
  const notes = String(input.notes ?? '');
  if (!text) return { field: 'text', message: 'Judul tugas wajib diisi.' };
  if (text.length > MAX_TASK_LENGTH) return { field: 'text', message: `Judul tugas maksimal ${MAX_TASK_LENGTH} karakter.` };
  if (category.length > 32) return { field: 'category', message: 'Kategori maksimal 32 karakter.' };
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { field: 'dueDate', message: 'Tanggal deadline tidak valid.' };
  if (input.dueTime && !isTimeString(input.dueTime)) return { field: 'dueTime', message: 'Jam deadline tidak valid.' };
  if (notes.length > MAX_NOTES_LENGTH) return { field: 'notes', message: 'Catatan terlalu panjang.' };
  if (input.url && String(input.url).trim() && !/^https?:\/\//i.test(String(input.url).trim())) return { field: 'url', message: 'Tautan harus diawali http:// atau https://.' };
  if (Array.isArray(input.subtasks) && input.subtasks.length > MAX_SUBTASKS) return { field: 'subtasks', message: `Subtask maksimal ${MAX_SUBTASKS}.` };
  return null;
}

export function validateCourseInput(input, existing = []) {
  const name = String(input.name ?? '').trim();
  if (!name) return { field: 'name', message: 'Nama mata kuliah wajib diisi.' };
  if (name.length > MAX_COURSE_NAME) return { field: 'name', message: `Nama maksimal ${MAX_COURSE_NAME} karakter.` };
  if (existing.length >= MAX_COURSES && !input.id) return { field: 'name', message: `Mata kuliah maksimal ${MAX_COURSES}.` };
  if (existing.some((course) => course.id !== input.id && course.name.toLowerCase() === name.toLowerCase())) return { field: 'name', message: 'Nama mata kuliah sudah ada.' };
  return null;
}

export function validateProfileInput(input) {
  const name = String(input.name ?? '').trim();
  const role = String(input.role ?? '').trim();
  const goal = String(input.goal ?? '').trim();
  if (!name) return { field: 'name', message: 'Nama panggilan wajib diisi.' };
  if (name.length > MAX_PROFILE_NAME_LENGTH) return { field: 'name', message: `Nama panggilan maksimal ${MAX_PROFILE_NAME_LENGTH} karakter.` };
  if (!PROFILE_ROLES.includes(role)) return { field: 'role', message: 'Pilih peranmu agar rekomendasi lebih relevan.' };
  if (!goal) return { field: 'goal', message: 'Tuliskan tujuan utama yang ingin kamu capai.' };
  if (goal.length > MAX_PROFILE_GOAL_LENGTH) return { field: 'goal', message: `Tujuan utama maksimal ${MAX_PROFILE_GOAL_LENGTH} karakter.` };
  return null;
}

const RECOMMENDATION_RULES = [
  { pattern: /ujian|belajar|kuliah|materi|semester/, category: 'Belajar', items: ['Tulis tiga topik yang paling penting untuk dipahami', 'Pilih satu materi untuk dipelajari lebih dulu', 'Buat rangkuman singkat dari sesi belajarmu', 'Uji pemahaman dengan lima pertanyaan'] },
  { pattern: /proyek|project|aplikasi|website|produk|coding|kode/, category: 'Proyek', items: ['Tulis hasil akhir proyek dalam satu kalimat', 'Pecah proyek menjadi milestone pertama', 'Buat daftar langkah teknis yang paling kecil', 'Jalankan satu sesi fokus untuk milestone pertama'] },
  { pattern: /presentasi|makalah|laporan|tulisan|proposal/, category: 'Pekerjaan', items: ['Tentukan pesan utama yang ingin disampaikan', 'Buat kerangka isi dalam tiga bagian', 'Kumpulkan bahan yang paling penting', 'Tulis draf pertama tanpa mengedit berlebihan'] },
  { pattern: /rutinitas|kebiasaan|olahraga|kesehatan|pribadi/, category: 'Pribadi', items: ['Tentukan perubahan kecil yang ingin dimulai', 'Pilih waktu paling realistis untuk melakukannya', 'Siapkan lingkungan agar langkah pertama mudah', 'Catat hasil pertama setelah selesai'] }
];

const GENERAL_RECOMMENDATIONS = [
  'Tulis hasil akhir yang ingin kamu capai',
  'Pecah tujuanmu menjadi langkah pertama yang kecil',
  'Pilih satu hal yang bisa selesai hari ini',
  'Jalankan satu sesi fokus untuk mulai bergerak'
];

export function getProfileRecommendations(profile) {
  const goal = String(profile?.goal ?? '').trim().toLowerCase();
  const role = PROFILE_ROLES.includes(profile?.role) ? profile.role : '';
  if (!goal || !role) return [];
  const rule = RECOMMENDATION_RULES.find((candidate) => candidate.pattern.test(goal));
  const category = rule?.category || PROFILE_ROLE_LABELS[role];
  const items = rule?.items || GENERAL_RECOMMENDATIONS;
  return items.slice(0, 5).map((text, index) => ({
    id: `${category.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
    text,
    category,
    priority: 'medium',
    estimateMinutes: 25,
    type: rule?.category === 'Belajar' ? 'bacaan' : rule?.category === 'Proyek' ? 'proyek' : 'tugas'
  }));
}

export function makeTask(input, id = Date.now()) {
  const now = Date.now();
  const subtasks = Array.isArray(input.subtasks)
    ? input.subtasks.map((item, index) => ({ id: now + index + 1, text: String(item.text ?? item).trim(), completed: Boolean(item.completed) })).filter((item) => item.text)
    : [];
  return normalizeTask({
    id,
    text: input.text,
    completed: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    dueDate: input.dueDate || null,
    dueTime: input.dueTime || null,
    priority: input.priority || 'medium',
    category: input.category || null,
    estimateMinutes: input.estimateMinutes || 25,
    courseId: input.courseId || null,
    type: input.type || 'pribadi',
    notes: input.notes || '',
    subtasks,
    url: input.url || null,
    pinned: Boolean(input.pinned),
    archived: false,
    recurrence: input.recurrence || 'none',
    reminderOffsetHours: input.reminderOffsetHours ?? null
  });
}

export function makeCourse(input, id = Date.now()) {
  return {
    id,
    name: String(input.name ?? '').trim(),
    code: String(input.code ?? '').trim(),
    color: COURSE_COLORS.includes(input.color) ? input.color : COURSE_COLORS[0],
    lecturer: String(input.lecturer ?? '').trim(),
    sks: Number(input.sks) || null,
    schedule: Array.isArray(input.schedule) ? input.schedule : []
  };
}

export function spawnNextOccurrence(task, now = Date.now()) {
  if (task.recurrence !== 'daily' && task.recurrence !== 'weekly') return null;
  const days = task.recurrence === 'daily' ? 1 : 7;
  const nextDue = task.dueDate ? todayString(addDays(parseDateString(task.dueDate), days)) : todayString(addDays(new Date(now), days));
  return makeTask({
    text: task.text,
    dueDate: nextDue,
    dueTime: task.dueTime,
    priority: task.priority,
    category: task.category,
    estimateMinutes: task.estimateMinutes,
    courseId: task.courseId,
    type: task.type,
    notes: task.notes,
    subtasks: (task.subtasks || []).map((item) => ({ text: item.text, completed: false })),
    url: task.url,
    pinned: task.pinned,
    recurrence: task.recurrence,
    reminderOffsetHours: task.reminderOffsetHours
  }, now);
}

export function addMilestones(progress, context) {
  const milestones = new Set(progress.milestones || []);
  if (context.taskCompleted) milestones.add('first-task');
  if (context.sessionCompleted) milestones.add('first-run');
  if (progress.currentStreak >= 3) milestones.add('three-day-streak');
  if (progress.totalXp >= 100) milestones.add('level-two');
  return { ...progress, milestones: [...milestones] };
}

export function awardConsistency(progress, dateKey) {
  if (progress.lastConsistencyRewardDate === dateKey) return progress;
  return { ...progress, totalXp: progress.totalXp + 5, lastConsistencyRewardDate: dateKey };
}

export function applyTaskCompletionReward(progress, task) {
  if (progress.rewardedTaskIds.includes(task.id)) return progress;
  const dateKey = todayString();
  let next = updateStreak(progress, dateKey);
  next = awardConsistency(next, dateKey);
  next = { ...next, totalXp: next.totalXp + getTaskXp(task), rewardedTaskIds: [...next.rewardedTaskIds, task.id] };
  next.level = getLevel(next.totalXp);
  return addMilestones(next, { taskCompleted: true });
}

export function applySessionReward(progress, activeSeconds) {
  const dateKey = todayString();
  let next = updateStreak(progress, dateKey);
  next = awardConsistency(next, dateKey);
  next = { ...next, totalXp: next.totalXp + getSessionXp(activeSeconds) };
  next.level = getLevel(next.totalXp);
  return addMilestones(next, { sessionCompleted: true });
}

export function applyTaskToggle(data, taskId, now = Date.now()) {
  const currentTarget = data.tasks.find((task) => task.id === taskId);
  if (!currentTarget) return { ...data, message: '' };
  const completed = !currentTarget.completed;
  let tasks = data.tasks.map((task) => task.id === taskId
    ? { ...task, completed, completedAt: completed ? now : null, updatedAt: now, archived: completed && task.recurrence !== 'none' ? true : task.archived && completed ? task.archived : false }
    : task);
  if (completed && currentTarget.recurrence !== 'none') {
    const nextTask = spawnNextOccurrence(currentTarget, now + 1);
    if (nextTask) tasks = [nextTask, ...tasks];
  }
  if (!completed) tasks = tasks.map((task) => task.id === taskId ? { ...task, archived: false } : task);
  let progress = data.progress;
  if (completed) progress = applyTaskCompletionReward(progress, currentTarget);
  const message = completed
    ? (currentTarget.recurrence !== 'none' ? `Tugas selesai. Salinan berikutnya sudah dibuat. +${getTaskXp(currentTarget)} XP.` : `Tugas selesai. +${getTaskXp(currentTarget)} XP.`)
    : 'Tugas dibuka kembali.';
  return { data: { ...data, tasks, progress }, message };
}

export function updateStreak(progress, dateKey) {
  const next = { ...progress };
  if (next.lastActiveDate === dateKey) return next;
  const gap = next.lastActiveDate ? differenceInCalendarDays(parseDateString(dateKey), parseDateString(next.lastActiveDate)) : null;
  next.currentStreak = gap === 1 ? next.currentStreak + 1 : 1;
  next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  next.lastActiveDate = dateKey;
  return next;
}

export function resolveTheme(preference, systemDark) {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemDark ? 'dark' : 'light';
}

export { TASK_TYPE_LABELS };
