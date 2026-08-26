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

export const SCHEMA_VERSION = 7;
export const BACKUP_VERSION = 7;

export const MAX_TASK_LENGTH = 120;
export const MAX_CATEGORY_LENGTH = 32;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_SUBTASKS = 12;
export const MAX_COURSES = 24;
export const MAX_COURSE_NAME = 48;
export const MAX_COURSE_CODE = 16;
export const MAX_SESSION_NOTE = 240;
export const MAX_DISTRACTIONS = 100;
export const MAX_URL_LENGTH = 300;
export const PRIORITIES = ['high', 'medium', 'low'];
export const ESTIMATE_OPTIONS = [15, 25, 50, 90];
export const PRIORITY_LABELS = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
export const PROFILE_ROLES = ['pelajar', 'mahasiswa', 'profesional', 'lainnya'];
export const PROFILE_ROLE_LABELS = { pelajar: 'Pelajar', mahasiswa: 'Mahasiswa', profesional: 'Profesional', lainnya: 'Lainnya' };
export const MAX_PROFILE_NAME_LENGTH = 40;
export const MAX_PROFILE_GOAL_LENGTH = 120;
export const TASK_TYPES = ['tugas', 'kuis', 'ujian', 'proyek', 'bacaan', 'pribadi'];
export const TASK_TYPE_LABELS = { tugas: 'Tugas', kuis: 'Kuis', ujian: 'Ujian', proyek: 'Proyek', bacaan: 'Bacaan', pribadi: 'Pribadi' };
export const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly'];
export const RECURRENCE_LABELS = { none: 'Tidak berulang', daily: 'Setiap hari', weekly: 'Setiap minggu' };
export const COURSE_COLORS = ['#2864f0', '#18b892', '#c98218', '#d95454', '#0f8fbd', '#7c5cbf'];
export const WEEKDAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const REMINDER_OFFSETS = [0, 1, 3, 24, 48];
export const THEME_OPTIONS = ['light', 'dark', 'system'];
export const FOCUS_SOUNDSCAPES = ['none', 'lofi', 'rain', 'noise'];
export const FOCUS_SOUNDSCAPE_LABELS = { none: 'Hening', lofi: 'Lo-fi', rain: 'Hujan', noise: 'White noise' };

export const DEFAULT_PROFILE = { name: '', role: '', goal: '', tagline: 'Ruang produktif harian' };
export const DEFAULT_ONBOARDING = { profileCompleted: false, tutorialCompleted: false, tutorialSkipped: false, completedAt: null, coursesIntroDismissed: false };
const DEFAULT_PREFERENCES = { motion: 'full', focusPreset: 25, theme: 'system', sound: true, notify: false, customFocusMinutes: 40, focusSoundscape: 'none', focusSoundVolume: 55 };

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isTimeString(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
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
    completedAt: source.completedAt !== null && Number.isFinite(Number(source.completedAt)) ? Number(source.completedAt) : fallback.completedAt ?? null,
    coursesIntroDismissed: typeof source.coursesIntroDismissed === 'boolean' ? source.coursesIntroDismissed : Boolean(fallback.coursesIntroDismissed)
  };
}

export function normalizeSubtask(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text ?? '').trim().slice(0, MAX_TASK_LENGTH);
  if (!text) return null;
  return {
    id: numberOr(raw.id, Date.now() + index),
    text,
    completed: Boolean(raw.completed)
  };
}

export function normalizeTask(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text ?? '').trim().slice(0, MAX_TASK_LENGTH);
  if (!text) return null;
  const fallback = Date.now() + index;
  const createdAt = numberOr(raw.createdAt, fallback);
  const completed = Boolean(raw.completed);
  const url = String(raw.url ?? '').trim().slice(0, MAX_URL_LENGTH);
  const reminder = Number(raw.reminderOffsetHours);
  return {
    id: numberOr(raw.id, fallback),
    text,
    completed,
    createdAt,
    updatedAt: numberOr(raw.updatedAt, createdAt),
    completedAt: completed && Number.isFinite(Number(raw.completedAt)) ? Number(raw.completedAt) : null,
    dueDate: isDateString(raw.dueDate) ? raw.dueDate : null,
    dueTime: isTimeString(raw.dueTime) ? raw.dueTime : null,
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
    category: String(raw.category ?? '').trim().slice(0, MAX_CATEGORY_LENGTH) || null,
    estimateMinutes: ESTIMATE_OPTIONS.includes(Number(raw.estimateMinutes)) ? Number(raw.estimateMinutes) : 25,
    courseId: Number.isFinite(Number(raw.courseId)) && Number(raw.courseId) > 0 ? Number(raw.courseId) : null,
    type: TASK_TYPES.includes(raw.type) ? raw.type : 'pribadi',
    notes: String(raw.notes ?? '').trim().slice(0, MAX_NOTES_LENGTH),
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks.map(normalizeSubtask).filter(Boolean).slice(0, MAX_SUBTASKS) : [],
    url: url && /^https?:\/\//i.test(url) ? url : null,
    pinned: Boolean(raw.pinned),
    archived: Boolean(raw.archived),
    recurrence: RECURRENCE_OPTIONS.includes(raw.recurrence) ? raw.recurrence : 'none',
    reminderOffsetHours: REMINDER_OFFSETS.includes(reminder) ? reminder : null
  };
}

export function normalizeScheduleSlot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const day = Number(raw.day);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  if (!isTimeString(raw.start) || !isTimeString(raw.end)) return null;
  return {
    day,
    start: raw.start,
    end: raw.end,
    room: String(raw.room ?? '').trim().slice(0, 32) || null
  };
}

export function normalizeCourse(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? '').trim().slice(0, MAX_COURSE_NAME);
  if (!name) return null;
  const color = COURSE_COLORS.includes(raw.color) ? raw.color : COURSE_COLORS[index % COURSE_COLORS.length];
  const sks = Number(raw.sks);
  return {
    id: numberOr(raw.id, Date.now() + index),
    name,
    code: String(raw.code ?? '').trim().slice(0, MAX_COURSE_CODE),
    color,
    lecturer: String(raw.lecturer ?? '').trim().slice(0, 48),
    sks: Number.isInteger(sks) && sks >= 1 && sks <= 8 ? sks : null,
    schedule: Array.isArray(raw.schedule) ? raw.schedule.map(normalizeScheduleSlot).filter(Boolean).slice(0, 8) : [],
    driveUrl: (() => {
      const value = String(raw.driveUrl ?? '').trim().slice(0, MAX_URL_LENGTH);
      return value && /^https?:\/\//i.test(value) ? value : null;
    })()
  };
}

export function normalizeSemester(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? '').trim().slice(0, 48);
  const startDate = isDateString(raw.startDate) ? raw.startDate : null;
  const endDate = isDateString(raw.endDate) ? raw.endDate : null;
  if (!name && !startDate && !endDate) return null;
  return { name: name || 'Semester berjalan', startDate, endDate };
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
    milestones: Array.isArray(source.milestones) ? source.milestones.map(String) : [],
    notifiedKeys: Array.isArray(source.notifiedKeys) ? source.notifiedKeys.map(String).slice(-200) : []
  };
}

export function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const status = raw.status === 'completed' || raw.status === 'abandoned' ? raw.status : null;
  if (!status) return null;
  const distractions = normalizeDistractions(raw.distractions);
  const derivedDistractionSeconds = distractions.reduce((sum, item) => sum + item.durationSeconds, 0);
  return {
    id: numberOr(raw.id, Date.now()),
    taskId: numberOr(raw.taskId, 0),
    plannedMinutes: Math.max(1, numberOr(raw.plannedMinutes, 25)),
    activeSeconds: Math.max(0, numberOr(raw.activeSeconds, 0)),
    status,
    startedAt: numberOr(raw.startedAt, Date.now()),
    endedAt: raw.endedAt !== null && raw.endedAt !== undefined && Number.isFinite(Number(raw.endedAt)) ? Number(raw.endedAt) : null,
    rewardApplied: Boolean(raw.rewardApplied),
    note: String(raw.note ?? '').trim().slice(0, MAX_SESSION_NOTE),
    distractions,
    distractionSeconds: Math.max(0, Math.floor(numberOr(raw.distractionSeconds, derivedDistractionSeconds)))
  };
}

export function normalizeDistraction(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const startedAt = numberOr(raw.startedAt, 0);
  if (!startedAt) return null;
  const endedAt = raw.endedAt !== null && raw.endedAt !== undefined && Number.isFinite(Number(raw.endedAt)) ? Number(raw.endedAt) : null;
  const elapsed = endedAt !== null ? Math.max(0, Math.floor((endedAt - startedAt) / 1000)) : 0;
  return {
    id: numberOr(raw.id, startedAt + index),
    startedAt,
    endedAt,
    durationSeconds: Math.max(0, Math.floor(numberOr(raw.durationSeconds, elapsed)))
  };
}

export function normalizeDistractions(raw) {
  return Array.isArray(raw) ? raw.map(normalizeDistraction).filter(Boolean).slice(-MAX_DISTRACTIONS) : [];
}

export function normalizeActiveFocus(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const statuses = ['focusing', 'paused', 'distracted', 'break'];
  const status = statuses.includes(raw.status) ? raw.status : null;
  if (!status) return null;
  const distractions = normalizeDistractions(raw.distractions);
  const openDistraction = [...distractions].reverse().find((item) => item.endedAt === null);
  const distractionStartedAt = status === 'distracted'
    ? (raw.distractionStartedAt !== null && raw.distractionStartedAt !== undefined && Number.isFinite(Number(raw.distractionStartedAt)) ? Number(raw.distractionStartedAt) : openDistraction?.startedAt || null)
    : null;
  return {
    taskId: numberOr(raw.taskId, 0),
    plannedMinutes: Math.max(1, numberOr(raw.plannedMinutes, 25)),
    breakMinutes: Math.max(1, numberOr(raw.breakMinutes, 5)),
    status,
    activeSeconds: Math.max(0, Math.floor(numberOr(raw.activeSeconds, 0))),
    runningSince: status === 'focusing' && raw.runningSince !== null && raw.runningSince !== undefined && Number.isFinite(Number(raw.runningSince)) ? Number(raw.runningSince) : null,
    sessionStartedAt: numberOr(raw.sessionStartedAt, Date.now()),
    breakEndsAt: raw.breakEndsAt !== null && raw.breakEndsAt !== undefined && Number.isFinite(Number(raw.breakEndsAt)) ? Number(raw.breakEndsAt) : null,
    sessionId: raw.sessionId !== null && raw.sessionId !== undefined && Number.isFinite(Number(raw.sessionId)) ? Number(raw.sessionId) : null,
    distractionStartedAt,
    distractions
  };
}

export function normalizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const custom = Math.round(numberOr(source.customFocusMinutes, DEFAULT_PREFERENCES.customFocusMinutes));
  const focusSoundVolume = Math.round(numberOr(source.focusSoundVolume, DEFAULT_PREFERENCES.focusSoundVolume));
  return {
    motion: ['full', 'compact', 'system'].includes(source.motion) ? source.motion : DEFAULT_PREFERENCES.motion,
    focusPreset: [25, 50].includes(Number(source.focusPreset)) ? Number(source.focusPreset) : DEFAULT_PREFERENCES.focusPreset,
    theme: THEME_OPTIONS.includes(source.theme) ? source.theme : DEFAULT_PREFERENCES.theme,
    sound: typeof source.sound === 'boolean' ? source.sound : DEFAULT_PREFERENCES.sound,
    notify: typeof source.notify === 'boolean' ? source.notify : DEFAULT_PREFERENCES.notify,
    customFocusMinutes: Math.min(180, Math.max(5, custom)),
    focusSoundscape: FOCUS_SOUNDSCAPES.includes(source.focusSoundscape) ? source.focusSoundscape : DEFAULT_PREFERENCES.focusSoundscape,
    focusSoundVolume: Math.min(100, Math.max(0, focusSoundVolume))
  };
}

export function createEmptyAppData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: [],
    courses: [],
    semester: null,
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
  const courses = Array.isArray(source.courses) ? source.courses.map(normalizeCourse).filter(Boolean).slice(0, MAX_COURSES) : [];
  const courseIds = new Set(courses.map((course) => course.id));
  const tasks = Array.isArray(source.tasks)
    ? source.tasks.map(normalizeTask).filter(Boolean).map((task) => (task.courseId && !courseIds.has(task.courseId) ? { ...task, courseId: null } : task))
    : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks,
    courses,
    semester: normalizeSemester(source.semester),
    profile: normalizeProfile(source.profile),
    onboarding: normalizeOnboarding(source.onboarding),
    progress: normalizeProgress(source.progress),
    sessions: Array.isArray(source.sessions) ? source.sessions.map(normalizeSession).filter(Boolean) : [],
    activeFocus: normalizeActiveFocus(source.activeFocus),
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
      // Existing IndexedDB workspaces are migrated in place. Legacy localStorage is only cleared on first IndexedDB create.
      if (stored) return normalizeAppData(stored);
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
    version: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    tasks: data.tasks,
    courses: data.courses,
    semester: data.semester,
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
    courses: source.courses,
    semester: source.semester,
    progress: source.progress,
    sessions: source.focusSessions,
    activeFocus: source.activeFocus,
    profile: source.profile,
    preferences: source.preferences,
    onboarding: source.onboarding
  });
}
