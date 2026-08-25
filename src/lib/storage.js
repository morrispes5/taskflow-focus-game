export const STORAGE_KEYS = {
  tasks: 'taskflow_tasks',
  progress: 'taskflow_progress',
  sessions: 'taskflow_focus_sessions',
  activeFocus: 'taskflow_focus_active',
  preferences: 'taskflow_preferences',
  username: 'taskflow_username',
  tagline: 'taskflow_tagline',
  role: 'taskflow_role',
  goal: 'taskflow_goal',
  onboarding: 'taskflow_onboarding'
};

export const MAX_TASK_LENGTH = 120;
export const MAX_CATEGORY_LENGTH = 32;
export const PRIORITIES = ['high', 'medium', 'low'];
export const ESTIMATE_OPTIONS = [15, 25, 50, 90];
export const PRIORITY_LABELS = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
export const PROFILE_ROLES = ['pelajar', 'mahasiswa', 'profesional', 'lainnya'];
export const PROFILE_ROLE_LABELS = { pelajar: 'Pelajar', mahasiswa: 'Mahasiswa', profesional: 'Profesional', lainnya: 'Lainnya' };
export const MAX_PROFILE_NAME_LENGTH = 40;
export const MAX_PROFILE_GOAL_LENGTH = 120;

export const DEFAULT_PROFILE = { name: '', role: '', goal: '', tagline: 'Ruang produktif harian' };
export const LEGACY_PROFILE_NAME = 'Vio';
export const DEFAULT_ONBOARDING = { profileCompleted: false, tutorialCompleted: false, tutorialSkipped: false, completedAt: null };
export const LEGACY_ONBOARDING = { profileCompleted: true, tutorialCompleted: true, tutorialSkipped: true, completedAt: null };
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

export function normalizeProfile(raw, fallback = DEFAULT_PROFILE) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    name: String(source.name ?? fallback.name ?? '').trim().slice(0, MAX_PROFILE_NAME_LENGTH),
    role: PROFILE_ROLES.includes(source.role) ? source.role : String(fallback.role ?? ''),
    goal: String(source.goal ?? fallback.goal ?? '').trim().slice(0, MAX_PROFILE_GOAL_LENGTH),
    tagline: String(source.tagline ?? fallback.tagline).trim().slice(0, 80) || DEFAULT_PROFILE.tagline
  };
}

export function normalizeOnboarding(raw, fallback = DEFAULT_ONBOARDING) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    profileCompleted: typeof source.profileCompleted === 'boolean' ? source.profileCompleted : Boolean(fallback.profileCompleted),
    tutorialCompleted: typeof source.tutorialCompleted === 'boolean' ? source.tutorialCompleted : Boolean(fallback.tutorialCompleted),
    tutorialSkipped: typeof source.tutorialSkipped === 'boolean' ? source.tutorialSkipped : Boolean(fallback.tutorialSkipped),
    completedAt: source.completedAt !== null && Number.isFinite(Number(source.completedAt)) ? Number(source.completedAt) : fallback.completedAt ?? null
  };
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
    category: String(raw.category ?? '').trim().slice(0, MAX_CATEGORY_LENGTH) || null,
    estimateMinutes: ESTIMATE_OPTIONS.includes(Number(raw.estimateMinutes)) ? Number(raw.estimateMinutes) : 25
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

function defaultProgress() {
  return normalizeProgress({});
}

function defaultSessions() { return []; }

function defaultActiveFocus() { return null; }

export function hasStoredWorkspace(storage = globalThis.localStorage) {
  return Object.entries(STORAGE_KEYS).some(([key, storageKey]) => key !== 'onboarding' && storage.getItem(storageKey) !== null);
}

export function loadAppData(storage = globalThis.localStorage) {
  const tasksRaw = storage.getItem(STORAGE_KEYS.tasks);
  const parsedTasks = safeParse(tasksRaw, null);
  const tasks = tasksRaw === null
    ? []
    : (Array.isArray(parsedTasks) ? parsedTasks.map(normalizeTask).filter(Boolean) : []);
  const hasLegacyWorkspace = hasStoredWorkspace(storage);
  const storedName = storage.getItem(STORAGE_KEYS.username);
  const storedRole = storage.getItem(STORAGE_KEYS.role);
  const storedGoal = storage.getItem(STORAGE_KEYS.goal);
  const profile = {
    name: storedName || (hasLegacyWorkspace ? LEGACY_PROFILE_NAME : DEFAULT_PROFILE.name),
    role: storedRole || DEFAULT_PROFILE.role,
    goal: storedGoal || DEFAULT_PROFILE.goal,
    tagline: storage.getItem(STORAGE_KEYS.tagline) || DEFAULT_PROFILE.tagline
  };
  const storedOnboarding = safeParse(storage.getItem(STORAGE_KEYS.onboarding), null);
  const onboarding = normalizeOnboarding(storedOnboarding, hasLegacyWorkspace ? LEGACY_ONBOARDING : DEFAULT_ONBOARDING);
  const parsedSessions = safeParse(storage.getItem(STORAGE_KEYS.sessions), defaultSessions());
  return {
    tasks,
    profile,
    onboarding,
    progress: normalizeProgress(safeParse(storage.getItem(STORAGE_KEYS.progress), defaultProgress())),
    sessions: Array.isArray(parsedSessions) ? parsedSessions.map(normalizeSession).filter(Boolean) : [],
    activeFocus: safeParse(storage.getItem(STORAGE_KEYS.activeFocus), defaultActiveFocus()),
    preferences: normalizePreferences(safeParse(storage.getItem(STORAGE_KEYS.preferences), DEFAULT_PREFERENCES))
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
  localStorage.setItem(STORAGE_KEYS.role, data.profile.role || '');
  localStorage.setItem(STORAGE_KEYS.goal, data.profile.goal || '');
  localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(data.onboarding));
  window.dispatchEvent(new CustomEvent('taskflow:data-changed'));
}

export function createBackup(data) {
  return {
    version: 3,
    exportedAt: Date.now(),
    tasks: data.tasks,
    progress: data.progress,
    focusSessions: data.sessions,
    activeFocus: data.activeFocus,
    profile: data.profile,
    preferences: data.preferences,
    onboarding: data.onboarding
  };
}

export function parseBackupPayload(payload) {
  const source = Array.isArray(payload) ? { tasks: payload } : payload;
  if (!source || !Array.isArray(source.tasks)) throw new Error('Format JSON tidak sesuai.');
  const normalizedTasks = source.tasks.map(normalizeTask).filter(Boolean);
  if (source.tasks.length > 0 && normalizedTasks.length === 0) throw new Error('Tidak ada tugas valid di file tersebut.');
  const legacyBackup = !source.onboarding;
  return {
    tasks: normalizedTasks,
    progress: normalizeProgress(source.progress),
    sessions: Array.isArray(source.focusSessions) ? source.focusSessions.map(normalizeSession).filter(Boolean) : [],
    activeFocus: source.activeFocus && typeof source.activeFocus === 'object' ? source.activeFocus : null,
    profile: normalizeProfile(source.profile, legacyBackup ? { ...DEFAULT_PROFILE, name: LEGACY_PROFILE_NAME } : DEFAULT_PROFILE),
    preferences: normalizePreferences(source.preferences),
    onboarding: normalizeOnboarding(source.onboarding, legacyBackup ? LEGACY_ONBOARDING : DEFAULT_ONBOARDING)
  };
}

export function storageKeyList() { return Object.values(STORAGE_KEYS); }
