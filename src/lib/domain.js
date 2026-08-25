import { addDays, differenceInCalendarDays, endOfDay, format, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import { normalizeTask, PRIORITY_LABELS, PROFILE_ROLE_LABELS, PROFILE_ROLES, MAX_PROFILE_GOAL_LENGTH, MAX_PROFILE_NAME_LENGTH } from './storage.js';

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
    estimateMinutes: 25
  }));
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
