# Changelog

## 5.3.0 - Guardrail, perbaikan bug, performa, dan keamanan data

- **Guardrail**: ESLint dengan `react-hooks/rules-of-hooks`, tes komponen aktif di jsdom, `script.js` legacy dihapus.
- **Bug**: `useReducedMotion` tidak lagi dipanggil bersyarat di Focus Run; streak yang ditampilkan tidak lagi basi ketika pengguna absen berhari-hari; id judul dialog kini unik per instance; shortcut `N` tidak lagi membajak `Ctrl+N`.
- **Performa**: aset turun dari 40 MB ke 7,1 MB (audio 32,8 MB ke 6,2 MB, ilustrasi PNG 6,35 MB ke WebP 179 KB). Halaman dipecah lewat `React.lazy` sehingga chunk bersama turun dari 560 kB ke 425 kB. Service worker memakai cache-first untuk aset dan network-first untuk dokumen, `CACHE` naik ke `taskflow-v5`.
- **Keamanan data**: snapshot otomatis diambil sebelum reset dan import, dengan pemulihan dari Pengaturan maupun dari gerbang profil. Preferensi mencatat `lastBackupAt` dan menampilkan pengingat export yang tenang. Tersedia opsi menandai penyimpanan sebagai persisten.
- Skema tetap **v8**; seluruh perubahan additive dan tidak menyentuh data yang sudah berjalan.

## 5.2.3 - Storage security hardening

- Migrasi `localStorage` legacy kini additive: data dipindahkan saat IndexedDB kosong dan key lama baru dibersihkan setelah transaksi sukses.
- Import backup dibatasi 10 MB, 2.000 tugas, dan 10.000 sesi fokus tanpa silent truncation atau perubahan pada workspace ongoing.
- Save, import, dan reset memakai revision metadata terpisah serta compare-and-swap untuk mencegah stale cross-tab write dan data lama muncul kembali setelah reset.
- Event `BroadcastChannel` kini membawa tipe perubahan dan revision; metadata internal tidak masuk backup dan schema tetap v8.
- Round-trip backup mempertahankan `reminderOffsetHours: null` tanpa mengubahnya menjadi pengingat 0 jam.

## 5.2.2 - Focus Run completion and review

- Menyelesaikan tugas saat Focus Run masih berjalan kini meminta konfirmasi, menghentikan timer, lalu menyimpan recap sesi secara konsisten.
- Saat timer mencapai target, TaskFlow menandai tugas selesai dan menampilkan konfirmasi keberhasilan yang jelas.
- Tugas yang sudah selesai dibuka sebagai mode review: timer opsional, sumber tugas tetap tersedia, dan tidak ada XP yang menyesatkan.
- Tautan tugas pada Quest Board kini dapat diklik langsung; kartu Focus Run Beranda kini selalu mengarah ke misi aktif atau review tugas terakhir.

## 5.2.1 - Completed calendar agenda

- Tugas yang sudah selesai tetap muncul pada agenda tanggal deadline dengan judul tercoret agar statusnya langsung terbaca.

## 5.2.0 - Academic Meeting Tracker & SKS Summary (schema v8)

- **Tracker Pertemuan Kuliah (1–16)**: Mata kuliah dapat mengelola daftar pertemuan materi, checklist kesiapan belajar, link materi Google Drive per slide/topik, serta tombol generator 16 pertemuan otomatis (UTS di P8, UAS di P16).
- **Integrasi Tugas & Meja Kerja Fokus**: Tugas dapat dihubungkan ke pertemuan spesifik (`meetingNumber`); link materi pertemuan otomatis muncul di meja kerja Focus Desk.
- **Rekap Beban SKS Semester**: Ringkasan total SKS aktif dan jumlah mata kuliah tampil di Pengaturan dan Kalender.
- **Role Contextual Adaptation**: Pengguna non-mahasiswa (Profesional / Lainnya) mendapatkan antarmuka yang otomatis beradaptasi menjadi Manajemen Proyek & Milestone, tetap tenang dan tanpa clutter jika tidak digunakan.
- **Schema v8 & Migrasi Additive**: Database dan backup naik ke v8 secara backward-compatible tanpa menghapus data versi terdahulu.

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
