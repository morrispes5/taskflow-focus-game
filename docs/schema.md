# TaskFlow data schema

`schemaVersion` saat ini: **8**
IndexedDB: `taskflow_workspace` / object store `workspace` / record key `app-data`  
Metadata internal disimpan terpisah pada record key `workspace-meta` dengan bentuk `{ revision: number }`. Object store version tetap `1` dan metadata ini tidak masuk backup pengguna.

## Record workspace

```js
{
  schemaVersion: 8,
  tasks: Task[],
  courses: Course[],
  semester: { name: string, startDate: string | null, endDate: string | null } | null,
  profile: { name, role, goal, tagline },
  onboarding: { profileCompleted, tutorialCompleted, tutorialSkipped, completedAt, coursesIntroDismissed },
  progress: { totalXp, level, currentStreak, bestStreak, lastActiveDate, streakFreezeMonth, streakFreezesUsed, lastConsistencyRewardDate, rewardedTaskIds, milestones, notifiedKeys },
  sessions: Session[],
  activeFocus: object | null,
  preferences: { motion, focusPreset, theme, sound, notify, customFocusMinutes, focusSoundscape, focusSoundVolume, lastBackupAt }
}
```

`progress.streakFreezeMonth` menyimpan bulan kalender aktif (`yyyy-MM` atau `null`), sedangkan `progress.streakFreezesUsed` menyimpan jumlah freeze yang terpakai pada bulan tersebut. Keduanya dimigrasikan secara additive; data lama mendapat `null` dan `0`.

## Task

Field lama (wajib tetap ada): `id`, `text`, `completed`, `createdAt`, `updatedAt`, `completedAt`, `dueDate`, `priority`, `category`, `estimateMinutes`.

Field v5/v8:

| Field | Default migrasi v4..v7 |
|---|---|
| `dueTime` | `null` (`HH:mm`) |
| `courseId` | `null` |
| `meetingNumber` | `null` (nomor pertemuan 1..32) |
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

## Course & Meetings (v8)

```js
{
  id: number,
  name: string,
  code: string,
  color: string,
  lecturer: string,
  sks: number | null,
  driveUrl: string | null,
  schedule: [{ day: 0-6, start: string, end: string, room: string | null }],
  meetings: Meeting[]
}

Meeting = {
  id: number,
  number: number,
  title: string,
  driveUrl: string | null,
  completed: boolean,
  notes: string
}
```

- Menghapus mata kuliah **tidak** menghapus tugas; `courseId` di-null-kan.
- `driveUrl` (pada level course maupun meeting) adalah `string | null` dan hanya menerima URL `http`/`https` sepanjang maksimal 300 karakter. TaskFlow hanya membuka link atas aksi pengguna; aplikasi tidak login, mengambil, membaca, atau menyinkronkan isi Google Drive.
- `meetings` berisi daftar pertemuan (standar 16 pertemuan kuliah dengan UTS di P8 & UAS di P16, atau 4 milestone proyek untuk pengguna profesional).
- Antarmuka beradaptasi sesuai `profile.role` (*Progressive Disclosure*): mahasiswa/pelajar mendapatkan istilah akademik (*Mata Kuliah*, *SKS*, *Pertemuan*), sedangkan profesional/lainnya mendapatkan istilah proyek (*Proyek*, *Bobot*, *Milestone*).

## Snapshot pemulihan

Key ketiga pada store yang sama: `app-data-snapshot`, berisi `{ data, savedAt, reason }`.

Snapshot **tidak** ikut pada jalur tulis biasa. Ia hanya diambil tepat sebelum operasi yang memang menghancurkan data, yaitu reset (`reason: 'reset'`) dan import (`reason: 'import'`), serta saat memulihkan dari Pengaturan (`reason: 'pemulihan'`). Penulisannya memakai transaksi sendiri dan kegagalannya ditelan, sehingga kode snapshot tidak pernah bisa membatalkan penyimpanan pengguna. `app-data` dan `workspace-meta` tidak tersentuh, jadi revision tidak berubah.

Snapshot tidak ikut ke backup JSON dan tidak dihitung sebagai bagian dari `schemaVersion`.

Pemulihan dari gerbang profil (setelah reset) sengaja **tidak** mengambil snapshot lebih dulu: workspace saat itu kosong, dan menyimpannya akan menimpa satu-satunya titik pulih yang ada.

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
  id, taskId, mode: 'focus' | 'review', plannedMinutes, activeSeconds,
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

`activeFocus.status` menerima `focusing`, `paused`, `distracted`, atau `break`; `activeFocus.mode` menerima `focus` (default untuk data lama) atau `review`. Mode `review` dipakai saat pengguna membuka tugas yang sudah selesai: timer tetap opsional, tetapi tidak memberi XP atau mengubah status tugas. Ketika status `distracted`, `activeSeconds` dan timer berhenti; `distractionStartedAt` menyimpan event yang sedang terbuka. Jeda sesi tidak dihitung sebagai distraksi.

Tracker ini manual. TaskFlow tidak mendeteksi atau membaca aplikasi/tab lain, dan waktu distraksi tidak dihitung sebagai waktu fokus aktif.

## Minggu semester

`Minggu ke-N` adalah informasi turunan: dihitung dari selisih kalender antara `semester.startDate` dan `task.dueDate` (tanggal mulai adalah minggu 1). Nilai ini tidak disimpan pada task.

## Filter analitik semester

`getAnalytics(..., { semester, scope })` dengan `scope: 'semester' | 'all'`.

Tugas masuk semester jika `dueDate` (atau `completedAt` / `createdAt` jika tidak ada deadline) berada di `startDate`–`endDate` (inklusif). Sesi fokus memakai `endedAt` atau `startedAt`. Batas boleh terbuka: hanya mulai, atau hanya selesai.

Rantai fallback itu bergantung pada `dateKeyFromTimestamp()` yang mengembalikan `null` untuk nilai kosong. Sempat tidak demikian: `Number(null)` bernilai `0` dan lolos `Number.isFinite`, sehingga `completedAt: null` menghasilkan `'1970-01-01'`, rantai tidak pernah sampai ke `createdAt`, dan **setiap tugas aktif tanpa deadline hilang dari analitik bermode semester**. Jangan menyederhanakan penjagaan nilai kosong di helper itu.

## Menunda dan carry-over mingguan

`applySnooze(data, taskId, target, now)` dengan `target: 'tomorrow' | 'weekend'` hanya menulis `dueDate` dan `updatedAt`. `'weekend'` memakai Sabtu berikutnya secara ketat, jadi menunda pada hari Sabtu jatuh ke Sabtu minggu depan. Target yang tidak dikenal mengembalikan `data` apa adanya.

`applyWeekCarryOver(data, taskIds, now)` menggeser `dueDate` tugas terpilih tepat tujuh hari sehingga harinya tetap sama. Tugas tanpa `dueDate` dilewati.

Keduanya **tidak** menyentuh `completed`, `completedAt`, `progress`, `sessions`, atau `archived`. Menunda bukan penyelesaian dan tidak boleh memberi XP.

`getWeekReview(tasks, sessions, reference)` membaca minggu berjalan (Senin–Minggu) dan mengembalikan `completed`, `slipped`, `upcoming`, `focusMinutes`, `sessionsCompleted`, serta `label`. `slipped` hanya berisi tugas aktif yang `dueDate`-nya **sudah lewat**, jadi tugas yang jatuh tempo hari ini belum dihitung meleset.

## Backup

Preferensi juga memuat `lastBackupAt` (epoch milidetik atau `null`), field additive di dalam v8 yang dicatat saat pengguna menekan Export JSON. Workspace lama tanpa nilai ini tetap sah dan mendapat `null`. `SCHEMA_VERSION` dan `BACKUP_VERSION` tetap 8.

`createBackup()` menulis `version: 8` plus `courses` (termasuk `meetings`), `semester`, preferensi soundscape, dan histori distraksi sesi.
`parseBackupPayload()` menerima array tugas mentah (legacy), backup v4, v5, v6, v7, dan v8.

Import memeriksa ukuran file sebelum membaca isinya: maksimal 10 MB, 2.000 tugas, dan 10.000 sesi fokus. Data di atas batas ditolak seluruhnya tanpa truncation dan tanpa mengganti workspace aktif. Batas ini hanya berlaku pada import; workspace ongoing tidak dipangkas.

## Migrasi

`load()`:

1. Jika record IndexedDB ada → `normalizeAppData(stored)` (additive).
2. Jika IndexedDB kosong dan `localStorage` legacy ada → parse dan normalisasi semua data legacy, tulis ke IndexedDB, lalu hapus key legacy hanya setelah transaksi sukses.
3. Jika IndexedDB dan data legacy sama-sama kosong → tulis workspace kosong.

Kegagalan parse atau write pada jalur (2) mempertahankan seluruh key legacy dan menampilkan pesan pemulihan. Jangan menambah wipe di jalur (1); record IndexedDB selalu authoritative.

## Revision dan multi-tab

Save, import, dan reset melewati satu write queue di aplikasi. Setiap save membandingkan expected revision dengan `workspace-meta` dalam transaksi yang sama dengan penulisan `app-data`. Snapshot stale ditolak; tab memuat data terbaru dan meminta pengguna mengulangi aksi, bukan menimpa atau melakukan auto-rebase diam-diam. Reset juga menulis workspace kosong dan menaikkan revision dalam satu transaksi, sehingga write lama tidak dapat menghidupkan data sebelum reset. `BroadcastChannel` mengirim `{ type, revision }`; string `updated` lama tetap diterima selama rollout lintas versi.
