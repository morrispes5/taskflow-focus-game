# Changelog

## 5.3.0 - Guardrail, perbaikan bug, performa, keamanan data, kebersihan kode, dan tiga fitur

Skema tetap **v8**. Seluruh perubahan additive dan tidak menyentuh data pengguna yang sedang berjalan. Tes naik dari 67 ke 130.

### Guardrail

- ESLint flat config dengan `react-hooks/rules-of-hooks` dan `react/jsx-uses-vars`. Aturan pertama langsung menemukan satu bug nyata di Focus Run.
- Tes komponen diaktifkan. `jsdom` dan `@testing-library/react` sudah lama terpasang tetapi tidak pernah terpakai karena Vitest hanya memuat `*.test.js` di environment node. Sekarang `*.test.jsx` berjalan di jsdom lewat `environmentMatchGlobs`, dengan `fake-indexeddb` dan `cleanup()` di `src/test/setup.js`.
- `script.js` legacy (277 baris, tidak direferensikan HTML mana pun) dihapus.
- Versi `package.json` disinkronkan dengan changelog.

### Bug

- **`useReducedMotion` dipanggil bersyarat** di FocusPage. Hook berada di sisi kanan `||`, sehingga jumlah hook berubah antar render dan halaman fokus mati di tengah sesi ketika preferensi motion diubah dari tab lain.
- **Streak yang ditampilkan basi.** `progress.currentStreak` hanya diperbarui saat ada aktivitas, jadi pengguna yang absen berhari-hari tetap melihat angka lama. `getDisplayStreak` menghitung tampilan dengan aturan freeze yang sama persis dengan `updateStreak`, tanpa menulis apa pun. Streak putus ditampilkan sebagai keadaan yang dijelaskan, bukan angka `0` telanjang, dan `bestStreak` tetap terlihat.
- **Tugas tanpa deadline hilang dari analitik semester.** `Number(null)` bernilai 0 dan lolos `Number.isFinite`, sehingga `dateKeyFromTimestamp(null)` mengembalikan `'1970-01-01'` dan rantai fallback di `taskInSemester` tidak pernah sampai ke `createdAt`.
- **Id judul dialog tidak unik.** Halaman Fokus memasang empat `<dialog>` sekaligus dengan `id="dialog-title"` yang sama; kini memakai `useId()`.
- **Shortcut `N`** di halaman Tugas ikut membajak `Ctrl+N` milik peramban.

### Performa

- Aset deploy turun dari **40 MB ke 7,1 MB**. Audio 32,8 MB ke 6,2 MB: lo-fi dipertahankan durasi penuhnya pada 96 kb/s stereo, hujan menjadi 56 kb/s mono, dan `rain-02` dipangkas dari 10 menit ke 4 menit. Ilustrasi PNG 1254 px (6,35 MB) menjadi WebP 1000 px (179 KB) dengan `loading="lazy"`, kecuali hero Beranda yang tetap eager.
- Halaman dimuat lewat `React.lazy` melalui `PAGE_MODULES`, dengan unduhan dimulai saat modul dievaluasi supaya paralel dengan hidrasi IndexedDB. Chunk bersama turun dari 560 kB ke 425 kB dan setiap dokumen hanya memuat kode halamannya sendiri.
- Service worker beralih ke cache-first untuk `/assets/` dan network-first untuk dokumen; permintaan lintas-origin dilewatkan dan respons non-ok tidak disimpan. `CACHE` naik ke `taskflow-v5`.

### Keamanan data

- **Snapshot pemulihan** pada key baru `app-data-snapshot`, diambil sebelum reset dan import, ditulis di transaksi terpisah dengan kegagalan yang ditelan supaya tidak pernah bisa menggagalkan penyimpanan pengguna.
- Reset mengembalikan pengguna ke gerbang profil tempat Pengaturan tidak terjangkau, jadi **gerbang profil kini menawarkan pemulihan** bila snapshot tersedia. Pemulihan dari sana sengaja tidak mengambil snapshot lebih dulu agar titik pulih satu-satunya tidak tertimpa.
- `preferences.lastBackupAt` dicatat saat Export JSON, dengan pengingat tenang di kartu backup setelah 14 hari atau bila belum pernah membuat backup.
- Opsi menandai penyimpanan sebagai persisten, di balik tombol eksplisit karena `persist()` memunculkan permintaan izin di sebagian peramban.

### Kebersihan kode

- Aturan label pertemuan diketik ulang di enam tempat dan tiga di antaranya lupa memeriksa peran, sehingga pengguna Profesional melihat milestone-nya diberi label UTS. `getMeetingBadge` dan `getMeetingLabel` menjadi satu-satunya sumber aturan.
- `saveTask` yang disalin di dua halaman dengan perilaku trim berbeda disatukan menjadi `applyTaskSave`.
- `PRIORITY_LABELS` dan `WEEKDAY_LABELS` sudah lama diekspor tetapi tetap diketik ulang; kini dipakai. `formatTimer` dan nama bulan Indonesia dipindahkan ke `domain.js`.
- Baris JSX terpanjang turun dari 2778 ke 542 karakter. Blok besar diekstrak ke `components/focus`, `components/home`, dan `components/settings` dengan markup dan className dipindahkan verbatim sehingga CSS tidak tersentuh.

### Fitur

- **Tunda cepat.** Menu tugas dan baris terlambat di agenda Beranda menawarkan Tunda ke besok dan Tunda ke akhir pekan. Hanya menggeser `dueDate`; tidak muncul untuk tugas yang sudah selesai.
- **Tutup minggu.** Bagian di Analitik yang memisahkan yang selesai, yang lewat tanggalnya, yang masih menunggu, dan menit fokus minggu berjalan, dengan satu aksi membawa tugas yang meleset ke minggu depan pada hari yang sama. Terbuka sendiri di akhir pekan, di hari lain hanya satu tautan.
- **Tangkap cepat global.** `Ctrl+K` membuka dialog tugas dari halaman mana pun, termasuk saat Focus Run berjalan. Dialognya dimuat lewat `React.lazy`.

### Sengaja tidak dikerjakan

- **Import mode gabung** dibatalkan. Ini satu-satunya jalur yang bila keliru dapat menghilangkan tugas atau menggandakan XP, sementara snapshot pemulihan sudah menutup skenario yang mendasarinya.
- **Memecah `components.css`** dibatalkan. Kaskade CSS bergantung pada urutan impor sehingga risikonya regresi visual menyeluruh, sedangkan masalah keterbacaan yang mendasarinya sudah selesai lewat ekstraksi komponen.

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
