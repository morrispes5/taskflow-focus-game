import { addDays, differenceInCalendarDays, endOfDay, format, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import { normalizeTask, PRIORITY_LABELS } from './storage.js';

export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function todayString(date = new Date()) { return format(date, 'yyyy-MM-dd'); }

export function parseDateString(value) { return parseISO(`${value}T00:00:00`); }

export function formatDate(value) {
  if (!value) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const date = parseDateString(value);
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export function isOverdue(task, reference = new Date()) {
  return Boolean(!task.completed && task.dueDate && task.dueDate < todayString(reference));
}

export function getDueInfo(task, reference = new Date()) {
  if (!task.dueDate) return { label: 'Tanpa deadline', tone: 'muted' };
  const today = todayString(reference);
  const tomorrow = todayString(addDays(reference, 1));
  if (!task.completed && task.dueDate < today) return { label: `Terlambat · ${formatDate(task.dueDate)}`, tone: 'danger' };
  if (task.dueDate === today) return { label: task.completed ? 'Deadline hari ini' : 'Hari ini', tone: 'focus' };
  if (task.dueDate === tomorrow) return { label: 'Besok', tone: 'muted' };
  return { label: formatDate(task.dueDate), tone: 'muted' };
}

export function getTaskXp(task) {
  return 10 + (task.priority === 'high' ? 5 : task.priority === 'medium' ? 3 : 0);
}

export function getSessionXp(activeSeconds) { return Math.floor(Math.max(0, activeSeconds) / 600); }

export function getLevel(totalXp) { return Math.floor(Math.max(0, totalXp) / 100) + 1; }

export function getNextLevelXp(totalXp) { return getLevel(totalXp) * 100; }

export function getWeekStart(reference = new Date()) { return startOfWeek(reference, { weekStartsOn: 1 }); }

export function isCompletedThisWeek(task, reference = new Date()) {
  return Boolean(task.completedAt && isWithinInterval(new Date(task.completedAt), { start: getWeekStart(reference), end: endOfDay(reference) }));
}

export function sortTasks(tasks, mode = 'newest') {
  return [...tasks].sort((a, b) => {
    if (mode === 'dueSoon') {
      const aDue = a.dueDate ? parseDateString(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? parseDateString(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue || Number(b.completed) - Number(a.completed) || b.createdAt - a.createdAt;
    }
    if (mode === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
    return b.createdAt - a.createdAt;
  });
}

export function filterTasks(tasks, { status = 'all', priority = 'all', category = 'all', search = '' } = {}) {
  const query = search.trim().toLowerCase();
  return tasks.filter((task) => {
    const statusMatch = status === 'all' || (status === 'active' ? !task.completed : task.completed);
    const priorityMatch = priority === 'all' || task.priority === priority;
    const categoryMatch = category === 'all' || (task.category || 'Tanpa kategori') === category;
    const searchMatch = !query || `${task.text} ${task.category || ''}`.toLowerCase().includes(query);
    return statusMatch && priorityMatch && categoryMatch && searchMatch;
  });
}

export function selectDailyMission(tasks, reference = new Date()) {
  const active = tasks.filter((task) => !task.completed);
  return [...active].sort((a, b) => {
    const rank = (task) => (isOverdue(task, reference) ? 0 : task.dueDate === todayString(reference) ? 1 : task.dueDate ? 2 : task.priority === 'high' ? 3 : 4);
    const rankDifference = rank(a) - rank(b);
    if (rankDifference) return rankDifference;
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
  })[0] || null;
}

export function getDashboardStats(tasks, progress, sessions, reference = new Date()) {
  const active = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);
  const today = todayString(reference);
  return {
    total: tasks.length,
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

export function getAnalytics(tasks, sessions, reference = new Date()) {
  const completed = tasks.filter((task) => task.completed);
  const withDeadline = completed.filter((task) => task.dueDate && task.completedAt);
  const onTime = withDeadline.filter((task) => task.completedAt <= endOfDay(parseDateString(task.dueDate)).getTime());
  const categoryMap = new Map();
  tasks.forEach((task) => { const key = task.category || 'Tanpa kategori'; categoryMap.set(key, (categoryMap.get(key) || 0) + 1); });
  const priority = ['high', 'medium', 'low'].map((key) => ({ label: PRIORITY_LABELS[key], key, count: tasks.filter((task) => task.priority === key).length })).filter((item) => item.count);
  const focusMinutes = Math.floor(sessions.filter((session) => session.status === 'completed').reduce((sum, session) => sum + session.activeSeconds, 0) / 60);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfWeek(reference, { weekStartsOn: 1 }), index);
    const key = todayString(date);
    return { key, label: format(date, 'EEE'), completed: completed.filter((task) => task.completedAt && todayString(new Date(task.completedAt)) === key).length, focus: Math.floor(sessions.filter((session) => session.status === 'completed' && session.endedAt && todayString(new Date(session.endedAt)) === key).reduce((sum, session) => sum + session.activeSeconds, 0) / 60) };
  });
  return {
    completionRate: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0,
    completed: completed.length,
    active: tasks.length - completed.length,
    overdue: tasks.filter((task) => isOverdue(task, reference)).length,
    onTimeRate: withDeadline.length ? Math.round((onTime.length / withDeadline.length) * 100) : 0,
    onTimeCount: onTime.length,
    withDeadline: tasks.filter((task) => task.dueDate).length,
    focusMinutes,
    sessionsCompleted: sessions.filter((session) => session.status === 'completed').length,
    category: [...categoryMap.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
    priority,
    days
  };
}

export function validateTaskInput(input) {
  const text = String(input.text ?? '').trim();
  const category = String(input.category ?? '').trim();
  if (!text) return { field: 'text', message: 'Judul tugas wajib diisi.' };
  if (text.length > 120) return { field: 'text', message: 'Judul tugas maksimal 120 karakter.' };
  if (category.length > 32) return { field: 'category', message: 'Kategori maksimal 32 karakter.' };
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { field: 'dueDate', message: 'Tanggal deadline tidak valid.' };
  return null;
}

export function makeTask(input, id = Date.now()) {
  const now = Date.now();
  return normalizeTask({ id, text: input.text, completed: false, createdAt: now, updatedAt: now, completedAt: null, dueDate: input.dueDate || null, priority: input.priority || 'medium', category: input.category || null, estimateMinutes: input.estimateMinutes || 25 });
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
