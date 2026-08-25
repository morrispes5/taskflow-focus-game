import { describe, expect, it } from 'vitest';
import { normalizeTask, parseBackupPayload } from './storage.js';

describe('storage migration', () => {
  it('menambahkan default untuk data tugas lama', () => {
    const migrated = normalizeTask({ id: 7, text: 'Tugas lama', completed: false, createdAt: 100 });
    expect(migrated.priority).toBe('medium');
    expect(migrated.category).toBeNull();
    expect(migrated.dueDate).toBeNull();
    expect(migrated.completedAt).toBeNull();
    expect(migrated.updatedAt).toBe(100);
  });

  it('menerima backup lama berbentuk array', () => {
    const backup = parseBackupPayload([{ id: 1, text: 'Backup lama', completed: false }]);
    expect(backup.tasks).toHaveLength(1);
    expect(backup.progress.totalXp).toBe(0);
    expect(backup.sessions).toEqual([]);
  });

  it('menolak backup tanpa daftar tugas', () => {
    expect(() => parseBackupPayload({ version: 2 })).toThrow('Format JSON tidak sesuai.');
  });
});
