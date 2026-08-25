export const STORAGE_KEYS = {
  tasks: 'taskflow_tasks',
  progress: 'taskflow_progress',
  sessions: 'taskflow_focus_sessions',
  activeFocus: 'taskflow_focus_active',
  preferences: 'taskflow_preferences',
  username: 'taskflow_username',
  tagline: 'taskflow_tagline'
};

export const MAX_TASK_LENGTH = 120;
export const MAX_CATEGORY_LENGTH = 32;
export const PRIORITIES = ['high', 'medium', 'low'];
export const PRIORITY_LABELS = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };

const DEFAULT_PROFILE = { name: 'Vio', tagline: 'Ruang produktif harian' };
const DEFAULT_PREFERENCES = { motion: 'full', focusPreset: 25 };

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
}

function safeParse(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeTask(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text ?? '').trim().slice(0, MAX_TASK_LENGTH);
  if (!text) return null;
  const fallback = Date.now() + index;
  const createdAt = numberOr(raw.createdAt, fallback);
  const completed = Boolean(raw.completed);
  return {
    id: numberOr(raw.id, fallback),
    text,
    completed,
    createdAt,
    updatedAt: numberOr(raw.updatedAt, createdAt),
    completedAt: completed && Number.isFinite(Number(raw.completedAt)) ? Number(raw.completedAt) : null,
    dueDate: isDateString(raw.dueDate) ? raw.dueDate : null,
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
    category: String(raw.category ?? '').trim().slice(0, MAX_CATEGORY_LENGTH) || null
  };
}

export function normalizeProgress(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    totalXp: Math.max(0, numberOr(source.totalXp, 0)),
    level: Math.max(1, numberOr(source.level, 1)),
    currentStreak: Math.max(0, numberOr(source.currentStreak, 0)),
    bestStreak: Math.max(0, numberOr(source.bestStreak, 0)),
    lastActiveDate: isDateString(source.lastActiveDate) ? source.lastActiveDate : null,
    lastConsistencyRewardDate: isDateString(source.lastConsistencyRewardDate) ? source.lastConsistencyRewardDate : null,
    rewardedTaskIds: Array.isArray(source.rewardedTaskIds) ? source.rewardedTaskIds.map(Number).filter(Number.isFinite) : [],
    milestones: Array.isArray(source.milestones) ? source.milestones.map(String) : []
  };
}

export function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const status = raw.status === 'completed' || raw.status === 'abandoned' ? raw.status : null;
  if (!status) return null;
  return {
    id: numberOr(raw.id, Date.now()),
    taskId: numberOr(raw.taskId, 0),
    plannedMinutes: Math.max(1, numberOr(raw.plannedMinutes, 25)),
    activeSeconds: Math.max(0, numberOr(raw.activeSeconds, 0)),
    status,
    startedAt: numberOr(raw.startedAt, Date.now()),
    endedAt: Number.isFinite(Number(raw.endedAt)) ? Number(raw.endedAt) : null,
    rewardApplied: Boolean(raw.rewardApplied)
  };
}

export function normalizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    motion: ['full', 'compact', 'system'].includes(source.motion) ? source.motion : DEFAULT_PREFERENCES.motion,
    focusPreset: [25, 50].includes(Number(source.focusPreset)) ? Number(source.focusPreset) : DEFAULT_PREFERENCES.focusPreset
  };
}

export function createDemoTasks() {
  const now = Date.now();
  const date = new Date();
  const dateString = (offset) => {
    const value = new Date(date);
    value.setDate(value.getDate() + offset);
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  };
  return [
    { id: 1, text: 'Pelajari struktur HTML dan CSS', completed: true, createdAt: now - 172800000, updatedAt: now - 86400000, completedAt: now - 86400000, dueDate: dateString(-1), priority: 'medium', category: 'Kuliah' },
    { id: 2, text: 'Hubungkan React ke halaman beranda', completed: false, createdAt: now - 3600000, updatedAt: now - 3600000, completedAt: null, dueDate: dateString(0), priority: 'high', category: 'Proyek' },
    { id: 3, text: 'Buat wireframe halaman Focus Run', completed: false, createdAt: now - 1800000, updatedAt: now - 1800000, completedAt: null, dueDate: dateString(1), priority: 'medium', category: 'Desain' }
  ];
}

function defaultProgress() {
  return normalizeProgress({});
}

function defaultSessions() { return []; }

function defaultActiveFocus() { return null; }

export function loadAppData() {
  const tasksRaw = localStorage.getItem(STORAGE_KEYS.tasks);
  const parsedTasks = safeParse(tasksRaw, null);
  const tasks = tasksRaw === null
    ? createDemoTasks()
    : (Array.isArray(parsedTasks) ? parsedTasks.map(normalizeTask).filter(Boolean) : []);
  const profile = {
    name: localStorage.getItem(STORAGE_KEYS.username) || DEFAULT_PROFILE.name,
    tagline: localStorage.getItem(STORAGE_KEYS.tagline) || DEFAULT_PROFILE.tagline
  };
  const parsedSessions = safeParse(localStorage.getItem(STORAGE_KEYS.sessions), defaultSessions());
  return {
    tasks,
    profile,
    progress: normalizeProgress(safeParse(localStorage.getItem(STORAGE_KEYS.progress), defaultProgress())),
    sessions: Array.isArray(parsedSessions) ? parsedSessions.map(normalizeSession).filter(Boolean) : [],
    activeFocus: safeParse(localStorage.getItem(STORAGE_KEYS.activeFocus), defaultActiveFocus()),
    preferences: normalizePreferences(safeParse(localStorage.getItem(STORAGE_KEYS.preferences), DEFAULT_PREFERENCES))
  };
}

export function saveAppData(data) {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(data.tasks));
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(data.progress));
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(data.sessions));
  if (data.activeFocus) localStorage.setItem(STORAGE_KEYS.activeFocus, JSON.stringify(data.activeFocus));
  else localStorage.removeItem(STORAGE_KEYS.activeFocus);
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(data.preferences));
  localStorage.setItem(STORAGE_KEYS.username, data.profile.name);
  localStorage.setItem(STORAGE_KEYS.tagline, data.profile.tagline);
  window.dispatchEvent(new CustomEvent('taskflow:data-changed'));
}

export function createBackup(data) {
  return {
    version: 2,
    exportedAt: Date.now(),
    tasks: data.tasks,
    progress: data.progress,
    focusSessions: data.sessions,
    activeFocus: data.activeFocus,
    profile: data.profile,
    preferences: data.preferences
  };
}

export function parseBackupPayload(payload) {
  const source = Array.isArray(payload) ? { tasks: payload } : payload;
  if (!source || !Array.isArray(source.tasks)) throw new Error('Format JSON tidak sesuai.');
  const normalizedTasks = source.tasks.map(normalizeTask).filter(Boolean);
  if (source.tasks.length > 0 && normalizedTasks.length === 0) throw new Error('Tidak ada tugas valid di file tersebut.');
  return {
    tasks: normalizedTasks,
    progress: normalizeProgress(source.progress),
    sessions: Array.isArray(source.focusSessions) ? source.focusSessions.map(normalizeSession).filter(Boolean) : [],
    activeFocus: source.activeFocus && typeof source.activeFocus === 'object' ? source.activeFocus : null,
    profile: {
      name: String(source.profile?.name ?? DEFAULT_PROFILE.name).trim().slice(0, 40) || DEFAULT_PROFILE.name,
      tagline: String(source.profile?.tagline ?? DEFAULT_PROFILE.tagline).trim().slice(0, 80) || DEFAULT_PROFILE.tagline
    },
    preferences: normalizePreferences(source.preferences)
  };
}

export function storageKeyList() { return Object.values(STORAGE_KEYS); }
