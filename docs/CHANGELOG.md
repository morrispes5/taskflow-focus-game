# Changelog

## 5.1.3 - Streak freeze

- Progress sekarang memiliki streak freeze per bulan kalender, dengan kuota maksimal tiga dan migrasi additive.
- Streak dapat diselamatkan dari hari terlewat jika kuota freeze cukup; sisa kuota tampil di Beranda dan dicatat pada toast reward.

## 5.1.2 - Focus Run duration guard

- Durasi awal Focus Run sekarang mengikuti estimasi task (`15`, `25`, `50`, atau `90` menit) dan hanya memakai preset global sebagai fallback.
- Sesi otomatis dijeda setelah halaman tidak terlihat selama 5 menit, lalu meminta konfirmasi saat pengguna kembali.
- XP sesi dibatasi sampai 150% dari durasi rencana agar tab yang terlupa terbuka tidak menghasilkan reward berlebihan.

## 5.1.1 - Focus Run state recovery

- Timer Focus Run beralih ke waktu tambahan setelah target tercapai sehingga sesi running tidak lagi terlihat stuck di `00:00`.
- Kontrol distraksi dan selesai tetap aktif serta terbaca jelas selama status `focusing` pada tema terang maupun gelap.
- Semua entry point Focus Run membawa intent eksplisit; sesi atau break lama kini menawarkan pilihan lanjutkan atau mulai sesi baru.
- Memulai sesi baru menyimpan sesi fokus lama sebagai `abandoned` tanpa reward, sementara break yang sudah tercatat tidak diduplikasi.

## 5.1.0 - Distraction Tracker (schema v7)

- Focus Desk membedakan jeda sesi dari distraksi yang ditandai manual.
- Timer dan soundscape berhenti saat distraksi ditandai, lalu melanjutkan sisa waktu ketika pengguna kembali fokus.
- Recap dan Analitik menampilkan jumlah distraksi serta waktu di luar fokus dari data sesi nyata.
- Histori distraksi, backup, dan workspace lama dimigrasikan secara additive.
- Soundscape lo-fi dan hujan memakai empat aset MP3 lokal dengan transisi fade.

## 5.0.0 - semester workspace v6

- Course dapat menyimpan folder Google Drive/materi secara lokal; Kalender dan Focus Desk menyediakan aksi buka folder.
- Task link diberi label Link tugas / Drive; TaskFlow tidak melakukan OAuth, sinkronisasi, atau membaca isi Drive.
- Fokus menjadi meja kerja satu tugas: brief, sumber materi, checklist, soundscape lokal, dan recap sesi.
- Web Audio menambahkan feedback tindakan dan soundscape lo-fi, hujan, atau white noise tanpa file streaming.
- Choreography terarah untuk dialog, task selesai, indikator mobile, kalender, dan state Focus Run; reduced motion tetap dihormati.
- Schema dan backup naik ke v6 secara additive. Workspace v5 tetap dimigrasikan tanpa menghapus data.

## 4.0.1 — filter analitik semester

- Analitik bisa difilter ke rentang semester (deadline / aktivitas di antara tanggal mulai–selesai) atau semua waktu.
- Validasi tanggal semester: selesai tidak boleh sebelum mulai.
- Tes khusus interval semester, scope analitik, dan jendela reminder (selesai/arsip/offset).

## 4.0.0 — ruang kerja semester

Paket pengayaan offline untuk pelajar/mahasiswa. Data lama tidak dihapus.

### Data

- `schemaVersion` 5 di IndexedDB `taskflow_workspace`.
- Entitas `courses` dan `semester`.
- Field tugas baru: `dueTime`, `courseId`, `type`, `notes`, `subtasks`, `url`, `pinned`, `archived`, `recurrence`, `reminderOffsetHours`.
- Preferensi: `theme`, `sound`, `notify`, `customFocusMinutes`.
- Backup JSON v5; import v4 tetap valid.

### Halaman dan UX

- Halaman baru `calendar.html` (bulan + agenda + jadwal kuliah).
- Beranda: agenda hari ini, countdown deadline, intro mata kuliah, progres per course.
- Tugas: filter mata kuliah/jenis/arsip, subtask, pin, duplikat, arsip, tautan.
- Focus Run: durasi custom, subtask, catatan sesi, chime, notifikasi selesai.
- Analitik per mata kuliah dan jenis tugas.
- Pengaturan: CRUD mata kuliah, semester, tema, bunyi, izin pengingat.
- Dark mode (`light` / `dark` / `system`).
- PWA: `manifest.webmanifest` + service worker production.
- Bottom nav di layar ≤760px.

### Kode

- Monolit `src/app.jsx` dipecah ke `src/pages/` dan `src/components/`.
- Logika murni di `src/lib/domain.js`; reminder di `src/lib/reminders.js`.
- File utama: `src/lib/storage.js`, `src/nav.js`, `vite.config.js`, `base.css`, `components.css`.

### Dokumentasi

- `AGENTS.md`, `docs/schema.md`, README dan `design.md` diselaraskan ke Baseline v2.
