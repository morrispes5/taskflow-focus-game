# TaskFlow data schema

`schemaVersion` saat ini: **7**
IndexedDB: `taskflow_workspace` / object store `workspace` / record key `app-data`  
Object store version tetap `1`. Yang berubah hanya isi record.

## Record workspace

```js
{
  schemaVersion: 7,
  tasks: Task[],
  courses: Course[],
  semester: { name: string, startDate: string | null, endDate: string | null } | null,
  profile: { name, role, goal, tagline },
  onboarding: { profileCompleted, tutorialCompleted, tutorialSkipped, completedAt, coursesIntroDismissed },
  progress: { totalXp, level, currentStreak, bestStreak, lastActiveDate, streakFreezeMonth, streakFreezesUsed, lastConsistencyRewardDate, rewardedTaskIds, milestones, notifiedKeys },
  sessions: Session[],
  activeFocus: object | null,
  preferences: { motion, focusPreset, theme, sound, notify, customFocusMinutes, focusSoundscape, focusSoundVolume }
}
```

`progress.streakFreezeMonth` menyimpan bulan kalender aktif (`yyyy-MM` atau `null`), sedangkan `progress.streakFreezesUsed` menyimpan jumlah freeze yang terpakai pada bulan tersebut. Keduanya dimigrasikan secara additive; data lama mendapat `null` dan `0`.

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
{ id, name, code, color, lecturer, sks, driveUrl, schedule: [{ day: 0-6, start, end, room }] }
```

Menghapus mata kuliah **tidak** menghapus tugas; `courseId` di-null-kan.

`driveUrl` pada v6 adalah `string | null` dan hanya menerima URL `http`/`https` sepanjang maksimal 300 karakter. TaskFlow hanya membuka link atas aksi pengguna; aplikasi tidak login, mengambil, membaca, atau menyinkronkan isi Google Drive.

## Preferensi v6

| Field | Nilai | Default migrasi |
|---|---|---|
| `focusSoundscape` | `none` \| `lofi` \| `rain` \| `noise` | `none` |
| `focusSoundVolume` | angka `0`-`100` | `55` |

Soundscape lo-fi dan hujan memakai aset MP3 lokal; White noise tetap dibuat dengan Web Audio. Soundscape hanya dimulai setelah pengguna menekan Mulai Focus Run dan tidak dipulihkan otomatis setelah refresh.

## Focus session dan Distraction Tracker

Sesi fokus lama tetap valid. Field baru bersifat additive:

```js
Session = {
  id, taskId, plannedMinutes, activeSeconds,
  status: 'completed' | 'abandoned',
  startedAt, endedAt, rewardApplied, note,
  distractions: Distraction[],
  distractionSeconds: number
}

Distraction = {
  id: number,
  startedAt: number,
  endedAt: number | null,
  durationSeconds: number
}
```

`activeFocus.status` menerima `focusing`, `paused`, `distracted`, atau `break`. Ketika status `distracted`, `activeSeconds` dan timer berhenti; `distractionStartedAt` menyimpan event yang sedang terbuka. Jeda sesi tidak dihitung sebagai distraksi.

Tracker ini manual. TaskFlow tidak mendeteksi atau membaca aplikasi/tab lain, dan waktu distraksi tidak dihitung sebagai waktu fokus aktif.

## Minggu semester

`Minggu ke-N` adalah informasi turunan: dihitung dari selisih kalender antara `semester.startDate` dan `task.dueDate` (tanggal mulai adalah minggu 1). Nilai ini tidak disimpan pada task.

## Filter analitik semester

`getAnalytics(..., { semester, scope })` dengan `scope: 'semester' | 'all'`.

Tugas masuk semester jika `dueDate` (atau `completedAt` / `createdAt` jika tidak ada deadline) berada di `startDate`–`endDate` (inklusif). Sesi fokus memakai `endedAt` atau `startedAt`. Batas boleh terbuka: hanya mulai, atau hanya selesai.

## Backup

`createBackup()` menulis `version: 7` plus `courses`, `semester`, preferensi soundscape, dan histori distraksi sesi.
`parseBackupPayload()` menerima array tugas mentah (legacy), backup v4, v5, v6, dan v7.

## Migrasi

`load()`:

1. Jika record IndexedDB ada → `normalizeAppData(stored)` (additive).
2. Jika tidak ada → hapus key `localStorage` legacy TaskFlow, tulis workspace kosong.

Jangan menambah wipe di jalur (1). Itu merusak pengguna yang sudah onboarding.
