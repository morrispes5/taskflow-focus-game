import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS, createEmptyAppData, createWorkspaceStore, normalizeTask, parseBackupPayload
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
});
