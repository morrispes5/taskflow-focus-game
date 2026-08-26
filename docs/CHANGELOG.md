# Changelog

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
