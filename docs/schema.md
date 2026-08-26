# TaskFlow data schema

`schemaVersion` saat ini: **5**  
IndexedDB: `taskflow_workspace` / object store `workspace` / record key `app-data`  
Object store version tetap `1`. Yang berubah hanya isi record.

## Record workspace

```js
{
  schemaVersion: 5,
  tasks: Task[],
  courses: Course[],
  semester: { name: string, startDate: string | null, endDate: string | null } | null,
  profile: { name, role, goal, tagline },
  onboarding: { profileCompleted, tutorialCompleted, tutorialSkipped, completedAt, coursesIntroDismissed },
  progress: { totalXp, level, currentStreak, bestStreak, lastActiveDate, lastConsistencyRewardDate, rewardedTaskIds, milestones, notifiedKeys },
  sessions: Session[],
  activeFocus: object | null,
  preferences: { motion, focusPreset, theme, sound, notify, customFocusMinutes }
}
```

## Task

Field lama (wajib tetap ada): `id`, `text`, `completed`, `createdAt`, `updatedAt`, `completedAt`, `dueDate`, `priority`, `category`, `estimateMinutes`.

Field v5:

| Field | Default migrasi v4 |
|---|---|
| `dueTime` | `null` (`HH:mm`) |
| `courseId` | `null` |
| `type` | `'pribadi'` |
| `notes` | `''` |
| `subtasks` | `[]` |
| `url` | `null` (hanya `http`/`https`) |
| `pinned` | `false` |
| `archived` | `false` |
| `recurrence` | `'none'` (`none` \| `daily` \| `weekly`) |
| `reminderOffsetHours` | `null` (`0`, `1`, `3`, `24`, `48`) |

`type`: `tugas` \| `kuis` \| `ujian` \| `proyek` \| `bacaan` \| `pribadi`.

Saat tugas `daily`/`weekly` diselesaikan, tugas itu diarsipkan dan salinan aktif baru dibuat dengan `dueDate` +1 / +7 hari. XP tidak dibatalkan jika tugas dibuka kembali.

## Course

```js
{ id, name, code, color, lecturer, sks, schedule: [{ day: 0-6, start, end, room }] }
```

Menghapus mata kuliah **tidak** menghapus tugas; `courseId` di-null-kan.

## Filter analitik semester

`getAnalytics(..., { semester, scope })` dengan `scope: 'semester' | 'all'`.

Tugas masuk semester jika `dueDate` (atau `completedAt` / `createdAt` jika tidak ada deadline) berada di `startDate`–`endDate` (inklusif). Sesi fokus memakai `endedAt` atau `startedAt`. Batas boleh terbuka: hanya mulai, atau hanya selesai.

## Backup

`createBackup()` menulis `version: 5` plus `courses` dan `semester`.  
`parseBackupPayload()` menerima array tugas mentah (legacy), backup v4, dan v5.

## Migrasi

`load()`:

1. Jika record IndexedDB ada → `normalizeAppData(stored)` (additive).
2. Jika tidak ada → hapus key `localStorage` legacy TaskFlow, tulis workspace kosong.

Jangan menambah wipe di jalur (1). Itu merusak pengguna yang sudah onboarding.
