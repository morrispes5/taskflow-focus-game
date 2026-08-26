import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS, createEmptyAppData, createWorkspaceStore, normalizeAppData, normalizeTask, parseBackupPayload
} from './storage.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    has(key) { return values.has(key); }
  };
}

function createStore(storage = createStorage()) {
  const indexedDb = new IDBFactory();
  return {
    storage,
    store: createWorkspaceStore({ indexedDb, storage, databaseName: `taskflow-test-${crypto.randomUUID()}` })
  };
}

describe('storage migration', () => {
  it('menambahkan default untuk data tugas lama', () => {
    const migrated = normalizeTask({ id: 7, text: 'Tugas lama', completed: false, createdAt: 100 });
    expect(migrated.priority).toBe('medium');
    expect(migrated.category).toBeNull();
    expect(migrated.dueDate).toBeNull();
    expect(migrated.completedAt).toBeNull();
    expect(migrated.updatedAt).toBe(100);
    expect(migrated.estimateMinutes).toBe(25);
  });

  it('memulai browser baru dengan workspace kosong dan onboarding profil', async () => {
    const { store } = createStore();
    const data = await store.load();
    expect(data.tasks).toEqual([]);
    expect(data.profile.name).toBe('');
    expect(data.onboarding.profileCompleted).toBe(false);
  });

  it('menghapus semua data legacy termasuk tiga task demo Android sekali saat migrasi', async () => {
    const storage = createStorage({
      [STORAGE_KEYS.tasks]: JSON.stringify([
        { id: 1, text: 'Buat wireframe halaman Focus Run', completed: false },
        { id: 2, text: 'Hubungkan React ke halaman beranda', completed: false },
        { id: 3, text: 'Pelajari struktur HTML dan CSS', completed: true }
      ]),
      [STORAGE_KEYS.username]: 'Vio',
      [STORAGE_KEYS.progress]: JSON.stringify({ totalXp: 20 })
    });
    const { store } = createStore(storage);

    const data = await store.load();

    expect(data.tasks).toEqual([]);
    expect(data.profile.name).toBe('');
    expect(data.onboarding.profileCompleted).toBe(false);
    Object.values(STORAGE_KEYS).forEach((key) => expect(storage.has(key)).toBe(false));
  });

  it('mengingat workspace baru pada browser yang sama tanpa menyentuh perangkat lain', async () => {
    const first = createStore();
    const initial = await first.store.load();
    await first.store.save({ ...initial, profile: { ...initial.profile, name: 'Naya', role: 'mahasiswa', goal: 'Menyusun makalah' }, onboarding: { ...initial.onboarding, profileCompleted: true }, tasks: [{ id: 9, text: 'Cari referensi', createdAt: 1, completed: false }] });

    const remembered = await first.store.load();
    const other = createStore();
    const otherDevice = await other.store.load();

    expect(remembered.profile.name).toBe('Naya');
    expect(remembered.tasks).toHaveLength(1);
    expect(otherDevice.profile.name).toBe('');
    expect(otherDevice.tasks).toEqual([]);
  });

  it('mengosongkan workspace dari Pengaturan dan meminta profil lagi', async () => {
    const { store } = createStore();
    const initial = await store.load();
    await store.save({ ...initial, profile: { ...initial.profile, name: 'Naya', role: 'mahasiswa', goal: 'Menyusun makalah' }, onboarding: { ...initial.onboarding, profileCompleted: true }, tasks: [{ id: 9, text: 'Cari referensi', createdAt: 1, completed: false }] });

    const reset = await store.reset();

    expect(reset).toEqual(createEmptyAppData());
    expect((await store.load()).tasks).toEqual([]);
  });

  it('menerima backup lama berbentuk array tanpa membuat profil palsu', () => {
    const backup = parseBackupPayload([{ id: 1, text: 'Backup lama', completed: false }]);
    expect(backup.tasks).toHaveLength(1);
    expect(backup.progress.totalXp).toBe(0);
    expect(backup.sessions).toEqual([]);
    expect(backup.onboarding.profileCompleted).toBe(false);
  });

  it('menolak backup tanpa daftar tugas', () => {
    expect(() => parseBackupPayload({ version: 2 })).toThrow('Format JSON tidak sesuai.');
  });

  it('memigrasikan workspace v6 ke schema 7 tanpa menghapus data', async () => {
    const { store } = createStore();
    const initial = await store.load();
    await store.save({
      ...initial,
      profile: { ...initial.profile, name: 'Vio', role: 'mahasiswa', goal: 'Ujian' },
      onboarding: { ...initial.onboarding, profileCompleted: true },
      tasks: [{ id: 4, text: 'Tugas lama', completed: false, createdAt: 10, updatedAt: 10, priority: 'high', category: 'Kuliah', estimateMinutes: 50 }]
    });
    const migrated = await store.load();
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.tasks).toHaveLength(1);
    expect(migrated.tasks[0].text).toBe('Tugas lama');
    expect(migrated.tasks[0].type).toBe('pribadi');
    expect(migrated.tasks[0].subtasks).toEqual([]);
    expect(migrated.tasks[0].recurrence).toBe('none');
    expect(migrated.courses).toEqual([]);
    expect(migrated.preferences.theme).toBe('system');
    expect(migrated.preferences.focusSoundscape).toBe('none');
    expect(migrated.preferences.focusSoundVolume).toBe(55);
  });

  it('menormalisasi histori distraksi dan status fokus lama tanpa mereset sesi', () => {
    const migrated = normalizeAppData({
      schemaVersion: 6,
      tasks: [{ id: 4, text: 'Tugas fokus', completed: false, createdAt: 10 }],
      sessions: [{ id: 30, taskId: 4, plannedMinutes: 50, activeSeconds: 900, status: 'completed', startedAt: 10, endedAt: 100, rewardApplied: true }],
      activeFocus: { taskId: 4, plannedMinutes: 50, breakMinutes: 10, status: 'distracted', activeSeconds: 900, runningSince: 999, sessionStartedAt: 10, distractionStartedAt: 1000, distractions: [{ id: 1000, startedAt: 1000, endedAt: null }] }
    });
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.sessions[0].distractions).toEqual([]);
    expect(migrated.sessions[0].distractionSeconds).toBe(0);
    expect(migrated.activeFocus.status).toBe('distracted');
    expect(migrated.activeFocus.runningSince).toBeNull();
    expect(migrated.activeFocus.distractions[0].startedAt).toBe(1000);
    expect(migrated.activeFocus.distractions[0].endedAt).toBeNull();
  });

  it('memulihkan timer fokus lama yang tidak menyimpan runningSince', () => {
    const migrated = normalizeAppData({
      schemaVersion: 7,
      tasks: [{ id: 4, text: 'Tugas fokus', completed: false, createdAt: 10 }],
      activeFocus: { taskId: 4, status: 'focusing', activeSeconds: 42, sessionStartedAt: 1000 }
    });
    expect(migrated.activeFocus.runningSince).toBe(1000);
    expect(migrated.activeFocus.activeSeconds).toBe(42);
  });

  it('menyimpan folder materi dan backup v6', async () => {
    const { store } = createStore();
    const initial = await store.load();
    const saved = await store.save({
      ...initial,
      courses: [{ id: 1, name: 'PBO', code: 'IF201', color: '#2864f0', driveUrl: 'https://drive.google.com/pbo', schedule: [{ day: 1, start: '08:00', end: '10:00', room: 'A1' }] }],
      tasks: [{ id: 2, text: 'PR PBO', courseId: 1, type: 'tugas', dueDate: '2026-09-01', dueTime: '23:59' }]
    });
    expect(saved.courses[0].name).toBe('PBO');
    expect(saved.courses[0].driveUrl).toBe('https://drive.google.com/pbo');
    expect(saved.tasks[0].courseId).toBe(1);
    const backup = parseBackupPayload({ version: 6, tasks: saved.tasks, courses: saved.courses, preferences: { focusSoundscape: 'rain', focusSoundVolume: 120 } });
    expect(backup.courses).toHaveLength(1);
    expect(backup.tasks[0].dueTime).toBe('23:59');
    expect(backup.preferences.focusSoundscape).toBe('rain');
    expect(backup.preferences.focusSoundVolume).toBe(100);
  });
});
