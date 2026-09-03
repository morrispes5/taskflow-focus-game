import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS, MAX_BACKUP_FILE_BYTES, MAX_IMPORT_SESSIONS, MAX_IMPORT_TASKS, WorkspaceConflictError,
  createBackup, createEmptyAppData, createWorkspaceStore, normalizeAppData, normalizeProgress, normalizeTask, parseBackupPayload, validateBackupFile
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

function createStore(storage = createStorage(), indexedDb = new IDBFactory(), databaseName = `taskflow-test-${crypto.randomUUID()}`) {
  return {
    storage,
    store: createWorkspaceStore({ indexedDb, storage, databaseName })
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

  it('menambahkan field streak freeze secara additive dan membatasi kuotanya', () => {
    expect(normalizeProgress({ totalXp: 12 })).toMatchObject({ streakFreezeMonth: null, streakFreezesUsed: 0 });
    expect(normalizeProgress({ streakFreezeMonth: '2026-08', streakFreezesUsed: 9 })).toMatchObject({ streakFreezeMonth: '2026-08', streakFreezesUsed: 3 });
    expect(normalizeProgress({ streakFreezeMonth: 'Agustus 2026', streakFreezesUsed: -1 }).streakFreezeMonth).toBeNull();
  });

  it('memulai browser baru dengan workspace kosong dan onboarding profil', async () => {
    const { store } = createStore();
    const snapshot = await store.load();
    expect(snapshot.data.tasks).toEqual([]);
    expect(snapshot.data.profile.name).toBe('');
    expect(snapshot.data.onboarding.profileCompleted).toBe(false);
    expect(snapshot.revision).toBe(1);
  });

  it('memigrasikan semua data legacy saat IndexedDB kosong lalu baru membersihkan key lama', async () => {
    const storage = createStorage({
      [STORAGE_KEYS.tasks]: JSON.stringify([
        { id: 1, text: 'Buat wireframe halaman Focus Run', completed: false },
        { id: 2, text: 'Hubungkan React ke halaman beranda', completed: false },
        { id: 3, text: 'Pelajari struktur HTML dan CSS', completed: true }
      ]),
      [STORAGE_KEYS.username]: 'Vio',
      [STORAGE_KEYS.tagline]: 'Pelan-pelan selesai',
      [STORAGE_KEYS.progress]: JSON.stringify({ totalXp: 20 }),
      [STORAGE_KEYS.sessions]: JSON.stringify([{ id: 7, taskId: 1, status: 'completed', activeSeconds: 600, startedAt: 1, endedAt: 601 }]),
      [STORAGE_KEYS.preferences]: JSON.stringify({ theme: 'dark', sound: false })
    });
    const { store } = createStore(storage);

    const { data } = await store.load();

    expect(data.tasks).toHaveLength(3);
    expect(data.tasks[0].text).toBe('Buat wireframe halaman Focus Run');
    expect(data.profile).toMatchObject({ name: 'Vio', tagline: 'Pelan-pelan selesai' });
    expect(data.progress.totalXp).toBe(20);
    expect(data.sessions).toHaveLength(1);
    expect(data.preferences).toMatchObject({ theme: 'dark', sound: false });
    expect(data.onboarding.profileCompleted).toBe(true);
    Object.values(STORAGE_KEYS).forEach((key) => expect(storage.has(key)).toBe(false));
  });

  it('mempertahankan semua key legacy jika transaksi migrasi gagal', async () => {
    const storage = createStorage({
      [STORAGE_KEYS.tasks]: JSON.stringify([{ id: 1, text: 'Data jangan hilang', completed: false }]),
      [STORAGE_KEYS.username]: 'Vio'
    });
    const { store } = createStore(storage);
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function putWithFailure(value, key) {
      if (key === 'app-data') throw new Error('Simulasi write failure');
      return originalPut.call(this, value, key);
    };
    try {
      await expect(store.load()).rejects.toThrow('Data aslinya tetap aman');
      expect(storage.has(STORAGE_KEYS.tasks)).toBe(true);
      expect(storage.has(STORAGE_KEYS.username)).toBe(true);
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }
  });

  it('mempertahankan key legacy dan memberi pesan pemulihan jika JSON lama rusak', async () => {
    const storage = createStorage({
      [STORAGE_KEYS.tasks]: '[JSON rusak',
      [STORAGE_KEYS.username]: 'Vio'
    });
    const { store } = createStore(storage);

    await expect(store.load()).rejects.toThrow('Data aslinya tetap aman');
    expect(storage.has(STORAGE_KEYS.tasks)).toBe(true);
    expect(storage.has(STORAGE_KEYS.username)).toBe(true);
  });

  it('mengingat workspace baru pada browser yang sama tanpa menyentuh perangkat lain', async () => {
    const first = createStore();
    const initial = await first.store.load();
    await first.store.save({ ...initial.data, profile: { ...initial.data.profile, name: 'Naya', role: 'mahasiswa', goal: 'Menyusun makalah' }, onboarding: { ...initial.data.onboarding, profileCompleted: true }, tasks: [{ id: 9, text: 'Cari referensi', createdAt: 1, completed: false }] }, initial.revision);

    const remembered = (await first.store.load()).data;
    const other = createStore();
    const otherDevice = (await other.store.load()).data;

    expect(remembered.profile.name).toBe('Naya');
    expect(remembered.tasks).toHaveLength(1);
    expect(otherDevice.profile.name).toBe('');
    expect(otherDevice.tasks).toEqual([]);
  });

  it('mengosongkan workspace dari Pengaturan dan meminta profil lagi', async () => {
    const { store } = createStore();
    const initial = await store.load();
    const saved = await store.save({ ...initial.data, profile: { ...initial.data.profile, name: 'Naya', role: 'mahasiswa', goal: 'Menyusun makalah' }, onboarding: { ...initial.data.onboarding, profileCompleted: true }, tasks: [{ id: 9, text: 'Cari referensi', createdAt: 1, completed: false }] }, initial.revision);

    const reset = await store.reset(saved.revision);

    expect(reset.data).toEqual(createEmptyAppData());
    expect((await store.load()).data.tasks).toEqual([]);
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

  it('memigrasikan workspace v6/v7 ke schema 8 tanpa menghapus data', async () => {
    const { store } = createStore();
    const initial = await store.load();
    await store.save({
      ...initial.data,
      profile: { ...initial.data.profile, name: 'Vio', role: 'mahasiswa', goal: 'Ujian' },
      onboarding: { ...initial.data.onboarding, profileCompleted: true },
      tasks: [{ id: 4, text: 'Tugas lama', completed: false, createdAt: 10, updatedAt: 10, priority: 'high', category: 'Kuliah', estimateMinutes: 50 }]
    }, initial.revision);
    const migrated = (await store.load()).data;
    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.tasks).toHaveLength(1);
    expect(migrated.tasks[0].text).toBe('Tugas lama');
    expect(migrated.tasks[0].type).toBe('pribadi');
    expect(migrated.tasks[0].subtasks).toEqual([]);
    expect(migrated.tasks[0].meetingNumber).toBeNull();
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
    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.sessions[0].distractions).toEqual([]);
    expect(migrated.sessions[0].distractionSeconds).toBe(0);
    expect(migrated.sessions[0].mode).toBe('focus');
    expect(migrated.activeFocus.status).toBe('distracted');
    expect(migrated.activeFocus.mode).toBe('focus');
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

  it('mempertahankan mode review secara additive pada sesi dan fokus aktif', () => {
    const migrated = normalizeAppData({
      tasks: [{ id: 4, text: 'Tugas selesai', completed: true, createdAt: 10 }],
      sessions: [{ id: 30, taskId: 4, mode: 'review', plannedMinutes: 15, activeSeconds: 120, status: 'completed', startedAt: 10, endedAt: 100, rewardApplied: false }],
      activeFocus: { taskId: 4, mode: 'review', plannedMinutes: 15, breakMinutes: 5, status: 'paused', activeSeconds: 120, sessionStartedAt: 10 }
    });
    expect(migrated.sessions[0].mode).toBe('review');
    expect(migrated.activeFocus.mode).toBe('review');
  });

  it('menyimpan folder materi dan backup v6', async () => {
    const { store } = createStore();
    const initial = await store.load();
    const saved = await store.save({
      ...initial.data,
      courses: [{ id: 1, name: 'PBO', code: 'IF201', color: '#2864f0', driveUrl: 'https://drive.google.com/pbo', schedule: [{ day: 1, start: '08:00', end: '10:00', room: 'A1' }] }],
      tasks: [{ id: 2, text: 'PR PBO', courseId: 1, type: 'tugas', dueDate: '2026-09-01', dueTime: '23:59' }]
    }, initial.revision);
    expect(saved.data.courses[0].name).toBe('PBO');
    expect(saved.data.courses[0].driveUrl).toBe('https://drive.google.com/pbo');
    expect(saved.data.tasks[0].courseId).toBe(1);
    const backup = parseBackupPayload({ version: 6, tasks: saved.data.tasks, courses: saved.data.courses, preferences: { focusSoundscape: 'rain', focusSoundVolume: 120 } });
    expect(backup.courses).toHaveLength(1);
    expect(backup.tasks[0].dueTime).toBe('23:59');
    expect(backup.preferences.focusSoundscape).toBe('rain');
    expect(backup.preferences.focusSoundVolume).toBe(100);
  });

  it('menolak meetingNumber jika courseId kosong atau course tidak ada dalam workspace', () => {
    const taskWithoutCourse = normalizeTask({ id: 1, text: 'Tugas lepas', courseId: null, meetingNumber: 3 });
    expect(taskWithoutCourse.meetingNumber).toBeNull();

    const appData = normalizeAppData({
      courses: [{ id: 10, name: 'Web Dev', meetings: [{ id: 1, number: 1, title: 'HTML' }] }],
      tasks: [
        { id: 1, text: 'Valid meeting', courseId: 10, meetingNumber: 1 },
        { id: 2, text: 'Orphan meeting', courseId: 999, meetingNumber: 2 }
      ]
    });
    expect(appData.tasks[0].courseId).toBe(10);
    expect(appData.tasks[0].meetingNumber).toBe(1);
    expect(appData.tasks[1].courseId).toBeNull();
    expect(appData.tasks[1].meetingNumber).toBeNull();
  });

  it('mengimpor backup schema v8 dengan daftar pertemuan course', () => {
    const backupV8 = parseBackupPayload({
      version: 8,
      courses: [{
        id: 1,
        name: 'Basis Data',
        meetings: [
          { id: 101, number: 1, title: 'ERD', driveUrl: 'https://drive.google.com/erd', completed: true },
          { id: 102, number: 8, title: 'UTS Basis Data', completed: false }
        ]
      }],
      tasks: [{ id: 201, text: 'Pelajari ERD', courseId: 1, meetingNumber: 1 }]
    });
    expect(backupV8.schemaVersion).toBe(8);
    expect(backupV8.courses[0].meetings).toHaveLength(2);
    expect(backupV8.courses[0].meetings[0].completed).toBe(true);
    expect(backupV8.courses[0].meetings[0].driveUrl).toBe('https://drive.google.com/erd');
    expect(backupV8.tasks[0].meetingNumber).toBe(1);
  });

  it('menjadikan record IndexedDB authoritative saat key legacy muncul kembali', async () => {
    const storage = createStorage();
    const { store } = createStore(storage);
    const initial = await store.load();
    const saved = await store.save({
      ...initial.data,
      tasks: [{ id: 9, text: 'Data IndexedDB', completed: false, createdAt: 1 }]
    }, initial.revision);
    storage.setItem(STORAGE_KEYS.tasks, JSON.stringify([{ id: 10, text: 'Data legacy stale', completed: false }]));

    const loaded = await store.load();

    expect(loaded.data.tasks[0].text).toBe('Data IndexedDB');
    expect(loaded.revision).toBe(saved.revision);
    expect(storage.has(STORAGE_KEYS.tasks)).toBe(true);
  });

  it('menolak file dan koleksi backup yang melewati batas sebelum mengganti workspace', () => {
    expect(validateBackupFile({ size: MAX_BACKUP_FILE_BYTES })).toEqual({ size: MAX_BACKUP_FILE_BYTES });
    expect(() => validateBackupFile({ size: MAX_BACKUP_FILE_BYTES + 1 })).toThrow('maksimal 10 MB');
    expect(() => parseBackupPayload({ tasks: Array.from({ length: MAX_IMPORT_TASKS + 1 }, (_, id) => ({ id, text: `Tugas ${id}` })) })).toThrow('2.000 tugas');
    expect(() => parseBackupPayload({ tasks: [], focusSessions: Array.from({ length: MAX_IMPORT_SESSIONS + 1 }, () => ({})) })).toThrow('10.000 sesi fokus');
  });

  it('menolak silent last-write-wins dan write lama setelah reset', async () => {
    const indexedDb = new IDBFactory();
    const databaseName = `taskflow-shared-${crypto.randomUUID()}`;
    const first = createStore(createStorage(), indexedDb, databaseName).store;
    const second = createStore(createStorage(), indexedDb, databaseName).store;
    const firstSnapshot = await first.load();
    const staleSnapshot = await second.load();
    const saved = await first.save({
      ...firstSnapshot.data,
      tasks: [{ id: 1, text: 'Perubahan tab pertama', completed: false, createdAt: 1 }]
    }, firstSnapshot.revision);

    await expect(second.save({
      ...staleSnapshot.data,
      tasks: [{ id: 2, text: 'Snapshot lama', completed: false, createdAt: 2 }]
    }, staleSnapshot.revision)).rejects.toBeInstanceOf(WorkspaceConflictError);
    expect((await second.load()).data.tasks[0].text).toBe('Perubahan tab pertama');

    const reset = await first.reset(saved.revision);
    await expect(second.save(saved.data, staleSnapshot.revision)).rejects.toBeInstanceOf(WorkspaceConflictError);
    expect(reset.revision).toBe(saved.revision + 1);
    expect((await second.load()).data.tasks).toEqual([]);
  });

  it('mempertahankan data penting pada round-trip export dan import v8', () => {
    const original = normalizeAppData({
      tasks: [{ id: 1, text: 'Tugas penting', completed: false, createdAt: 10 }],
      courses: [{ id: 2, name: 'Keamanan Web' }],
      profile: { name: 'Vio', role: 'mahasiswa', goal: 'Lulus tepat waktu', tagline: 'Tetap fokus' },
      progress: { totalXp: 240, currentStreak: 4, bestStreak: 7 },
      sessions: [{ id: 3, taskId: 1, status: 'completed', activeSeconds: 1500, startedAt: 10, endedAt: 1510 }],
      preferences: { theme: 'dark', sound: false },
      onboarding: { profileCompleted: true, tutorialCompleted: true }
    });

    const restored = parseBackupPayload(JSON.parse(JSON.stringify(createBackup(original))));

    expect(restored.tasks).toEqual(original.tasks);
    expect(restored.courses).toEqual(original.courses);
    expect(restored.profile).toEqual(original.profile);
    expect(restored.progress).toEqual(original.progress);
    expect(restored.sessions).toEqual(original.sessions);
    expect(restored.preferences).toEqual(original.preferences);
    expect(restored.onboarding).toEqual(original.onboarding);
  });
});

describe('snapshot pemulihan', () => {
  const withTasks = (data, text) => ({ ...data, tasks: [normalizeTask({ id: 1, text, completed: false, createdAt: 1 })] });

  it('tidak punya snapshot pada workspace baru', async () => {
    const { store } = createStore();
    await store.load();
    expect(await store.readSnapshot()).toBeNull();
  });

  it('menyimpan keadaan sebelum reset sehingga data lama masih bisa dipulihkan', async () => {
    const { store } = createStore();
    const loaded = await store.load();
    const saved = await store.save(withTasks(loaded.data, 'Laporan akhir semester'), loaded.revision);

    const reset = await store.reset(saved.revision);
    expect(reset.data.tasks).toEqual([]);

    const snapshot = await store.readSnapshot();
    expect(snapshot.reason).toBe('reset');
    expect(snapshot.data.tasks.map((task) => task.text)).toEqual(['Laporan akhir semester']);
  });

  it('menyimpan keadaan sebelum import dan tidak tertimpa oleh import itu sendiri', async () => {
    const { store } = createStore();
    const loaded = await store.load();
    const saved = await store.save(withTasks(loaded.data, 'Tugas yang sedang berjalan'), loaded.revision);

    await store.captureSnapshot('import');
    const imported = await store.save(withTasks(saved.data, 'Isi backup lama'), saved.revision);
    expect(imported.data.tasks.map((task) => task.text)).toEqual(['Isi backup lama']);

    const snapshot = await store.readSnapshot();
    expect(snapshot.reason).toBe('import');
    expect(snapshot.data.tasks.map((task) => task.text)).toEqual(['Tugas yang sedang berjalan']);
  });

  it('menyimpan snapshot di key terpisah sehingga app-data dan revision tidak berubah', async () => {
    const { store } = createStore();
    const loaded = await store.load();
    const saved = await store.save(withTasks(loaded.data, 'Tetap utuh'), loaded.revision);

    await store.captureSnapshot('import');

    const after = await store.load();
    expect(after.revision).toBe(saved.revision);
    expect(after.data.tasks.map((task) => task.text)).toEqual(['Tetap utuh']);
  });

  it('tidak ikut masuk ke backup', async () => {
    const { store } = createStore();
    const loaded = await store.load();
    const saved = await store.save(withTasks(loaded.data, 'Tugas nyata'), loaded.revision);
    await store.captureSnapshot('import');
    expect(Object.keys(createBackup(saved.data))).not.toContain('snapshot');
  });
});

describe('preferensi lastBackupAt', () => {
  it('default null dan tetap additive untuk workspace lama', () => {
    expect(normalizeAppData({}).preferences.lastBackupAt).toBeNull();
    expect(normalizeAppData({ preferences: { theme: 'dark' } }).preferences).toMatchObject({ theme: 'dark', lastBackupAt: null });
  });

  it('mempertahankan stempel waktu yang sah dan menolak yang tidak masuk akal', () => {
    expect(normalizeAppData({ preferences: { lastBackupAt: 1756000000000 } }).preferences.lastBackupAt).toBe(1756000000000);
    expect(normalizeAppData({ preferences: { lastBackupAt: 'kemarin' } }).preferences.lastBackupAt).toBeNull();
    expect(normalizeAppData({ preferences: { lastBackupAt: -5 } }).preferences.lastBackupAt).toBeNull();
  });

  it('bertahan pada round-trip backup', () => {
    const data = normalizeAppData({ preferences: { lastBackupAt: 1756000000000 } });
    expect(parseBackupPayload(createBackup(data)).preferences.lastBackupAt).toBe(1756000000000);
  });
});
