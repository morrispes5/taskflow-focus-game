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

export const DATABASE_NAME = 'taskflow_workspace';
const DATABASE_VERSION = 1;
const STORE_NAME = 'workspace';
const APP_RECORD_KEY = 'app-data';

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
export const DEFAULT_ONBOARDING = { profileCompleted: false, tutorialCompleted: false, tutorialSkipped: false, completedAt: null };
const DEFAULT_PREFERENCES = { motion: 'full', focusPreset: 25 };

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
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

export function createEmptyAppData() {
  return {
    tasks: [],
    profile: { ...DEFAULT_PROFILE },
    onboarding: { ...DEFAULT_ONBOARDING },
    progress: normalizeProgress({}),
    sessions: [],
    activeFocus: null,
    preferences: normalizePreferences({})
  };
}

export function normalizeAppData(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    tasks: Array.isArray(source.tasks) ? source.tasks.map(normalizeTask).filter(Boolean) : [],
    profile: normalizeProfile(source.profile),
    onboarding: normalizeOnboarding(source.onboarding),
    progress: normalizeProgress(source.progress),
    sessions: Array.isArray(source.sessions) ? source.sessions.map(normalizeSession).filter(Boolean) : [],
    activeFocus: source.activeFocus && typeof source.activeFocus === 'object' ? source.activeFocus : null,
    preferences: normalizePreferences(source.preferences)
  };
}

export function storageKeyList() { return Object.values(STORAGE_KEYS); }

export function clearLegacyTaskFlowData(storage = globalThis.localStorage) {
  storageKeyList().forEach((key) => storage.removeItem(key));
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Database browser tidak dapat dibaca.'));
  });
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('Database browser tidak dapat disimpan.'));
    transaction.onerror = () => reject(transaction.error || new Error('Database browser tidak dapat disimpan.'));
  });
}

export function createWorkspaceStore({ indexedDb = globalThis.indexedDB, storage = globalThis.localStorage, databaseName = DATABASE_NAME } = {}) {
  if (!indexedDb) throw new Error('Browser ini tidak mendukung penyimpanan data TaskFlow.');
  let databasePromise;

  const openDatabase = () => {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDb.open(databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Database browser tidak dapat dibuka.'));
    });
    return databasePromise;
  };

  const read = async () => {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const value = await requestResult(transaction.objectStore(STORE_NAME).get(APP_RECORD_KEY));
    await transactionResult(transaction);
    return value;
  };

  const write = async (data) => {
    const normalized = normalizeAppData(data);
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(normalized, APP_RECORD_KEY);
    await transactionResult(transaction);
    return normalized;
  };

  return {
    async load() {
      const stored = await read();
      if (stored) return normalizeAppData(stored);
      // Version four deliberately starts all previously visited browsers with a blank workspace.
      clearLegacyTaskFlowData(storage);
      return write(createEmptyAppData());
    },
    save(data) { return write(data); },
    async reset() {
      clearLegacyTaskFlowData(storage);
      return write(createEmptyAppData());
    },
    close() {
      if (!databasePromise) return;
      databasePromise.then((database) => database.close());
      databasePromise = undefined;
    }
  };
}

const defaultStore = typeof window === 'undefined' ? null : createWorkspaceStore();

export function loadAppData() { return defaultStore.load(); }
export function saveAppData(data) { return defaultStore.save(data); }
export function resetAppData() { return defaultStore.reset(); }

export function createBackup(data) {
  return {
    version: 4,
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
  return normalizeAppData({
    tasks: normalizedTasks,
    progress: source.progress,
    sessions: source.focusSessions,
    activeFocus: source.activeFocus,
    profile: source.profile,
    preferences: source.preferences,
    onboarding: source.onboarding
  });
}
