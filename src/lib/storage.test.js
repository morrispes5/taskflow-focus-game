import { describe, expect, it } from 'vitest';
import { loadAppData, normalizeTask, parseBackupPayload } from './storage.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
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

  it('memulai workspace baru tanpa demo task dan onboarding profil', () => {
    const data = loadAppData(createStorage());
    expect(data.tasks).toEqual([]);
    expect(data.profile.name).toBe('');
    expect(data.onboarding.profileCompleted).toBe(false);
  });

  it('mempertahankan workspace lama tanpa memaksa onboarding baru', () => {
    const storage = createStorage({
      taskflow_tasks: JSON.stringify([{ id: 4, text: 'Data lama', completed: false }]),
      taskflow_username: 'Vio'
    });
    const data = loadAppData(storage);
    expect(data.tasks[0].text).toBe('Data lama');
    expect(data.profile.name).toBe('Vio');
    expect(data.onboarding.profileCompleted).toBe(true);
  });

  it('menerima backup lama berbentuk array', () => {
    const backup = parseBackupPayload([{ id: 1, text: 'Backup lama', completed: false }]);
    expect(backup.tasks).toHaveLength(1);
    expect(backup.progress.totalXp).toBe(0);
    expect(backup.sessions).toEqual([]);
    expect(backup.onboarding.profileCompleted).toBe(true);
  });

  it('menolak backup tanpa daftar tugas', () => {
    expect(() => parseBackupPayload({ version: 2 })).toThrow('Format JSON tidak sesuai.');
  });
});
