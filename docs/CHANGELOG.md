# Changelog

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
