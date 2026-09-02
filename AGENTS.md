# TaskFlow — panduan untuk AI dan maintainer

Baca file ini sebelum mengubah kode. Kontrak data ada di `docs/schema.md`. Riwayat perubahan ada di `docs/CHANGELOG.md`. Arah produk ada di `design.md`.

## Apa ini

TaskFlow adalah aplikasi web **offline** untuk pelajar/mahasiswa. Tidak ada login, backend, atau sinkron cloud. Deploy ke GitHub Pages dari branch `main`.

Repo: `morrispes5/taskflow-focus-game`
Live: `https://morrispes5.github.io/taskflow-focus-game/`

Ada pengguna aktif dengan streak dan XP berjalan. Perubahan apa pun harus memperlakukan data yang sudah ada sebagai milik orang lain.

## Aturan yang tidak boleh dilanggar

- Jangan menambah server, akun, atau kirim data pengguna ke jaringan.
- Jangan menghapus workspace pengguna saat load. Migrasi harus additive.
- Jangan mengganti `base: './'` di `vite.config.js`. Path absolut merusak GitHub Pages di subpath.
- Seluruh kode aktif ada di `src/`. Prototipe `script.js` sudah dihapus; jangan menghidupkannya kembali.
- UI Bahasa Indonesia. Focus Run tetap loop utama: satu misi, satu sesi.
- Jangan membuat dashboard ramai, gradient besar, atau metrik fiktif.
- Jangan menambahkan aset besar. Lihat bagian **Aset**.

## Arsitektur

Aplikasi React 19 + Vite **multi-page**. Setiap HTML punya `body[data-page]`. `src/app.jsx` merender halaman yang sesuai.

```text
src/
  app.jsx                 hydrate IndexedDB, commit(), tema, reminder, Ctrl+K, page switch
  main.jsx                mount + register service worker (production only)
  nav.js                  PAGE_META dan NAV_ITEMS
  pages/                  Home, Tasks, Calendar, Focus, Analytics, Settings
  components/
    AppShell, ui, TaskRow, TaskDialog, CourseForm, CourseMeetingModal, Onboarding
    focus/                FocusStageCopy, FocusTimer, DistractionTracker,
                          FocusDesk, FocusControls, FocusRecap
    home/                 MissionCard, ProgressCard, HomeLower, RecommendationPanel
    settings/             SemesterForm, ProfileForm, SettingsAside
    analytics/            WeekReview
  lib/storage.js          IndexedDB, normalize*, backup, snapshot, schemaVersion
  lib/domain.js           selector murni, applyTaskToggle, recurrence, snooze, week review
  lib/reminders.js        banner deadline + Notification
  lib/audio.js            Web Audio feedback dan soundscape lokal
  motion/anime.js         sequence reward/hero
  test/setup.js           fake-indexeddb, jest-dom, cleanup Testing Library
```

Satu pintu tulis: `commit(updater, message, feedback)` di `app.jsx`. Domain tidak menyentuh `window` kecuali reminder helpers.

Halaman baru: buat `nama.html` dengan `data-page`, daftarkan di `vite.config.js` `build.rollupOptions.input`, tambah item di `src/nav.js`, lalu tambahkan importer di `PAGE_MODULES` pada `app.jsx`.

### Code splitting

`app.jsx` **tidak** mengimpor halaman secara statis. `PAGE_MODULES` memetakan `data-page` ke `import()`, dan unduhan chunk dimulai saat modul dievaluasi supaya berjalan paralel dengan hidrasi IndexedDB. Setiap dokumen hanya memuat kode halamannya sendiri.

Jangan mengembalikan import statis halaman ke `app.jsx`; itu menaikkan chunk bersama dari 425 kB kembali ke 560 kB.

## Data

IndexedDB `taskflow_workspace` / store `workspace`, dengan tiga key: `app-data`, `workspace-meta`, dan `app-data-snapshot`. Versi object store tetap `1`. Versi aplikasi ada di `schemaVersion` (sekarang **8**).

`normalizeAppData()` selalu mengeluarkan bentuk v8. Record lama tanpa `courses`, `Course.meetings`, `Course.driveUrl`, preferensi soundscape, histori distraksi, atau `preferences.lastBackupAt` diisi default, **bukan** di-reset.

Backup JSON versi 4/v5/v6/v7 tetap bisa diimport. Backup baru memakai `version: 8`.

### Snapshot pemulihan

Snapshot hanya diambil sebelum operasi yang memang menghancurkan data: reset, import, dan pemulihan itu sendiri. Ia ditulis di **transaksi terpisah** dan kegagalannya ditelan.

Jangan memindahkannya ke dalam transaksi `write()`. Transaksi itu melakukan compare-and-swap plus dua `put` sebagai satu kesatuan; menambahkan operasi ketiga membuat bug apa pun pada snapshot meng-abort transaksi dan **menggagalkan penyimpanan pengguna**.

Pemulihan dari gerbang profil sengaja **tidak** mengambil snapshot lebih dulu, karena workspace saat itu kosong dan menyimpannya akan menimpa satu-satunya titik pulih yang ada.

## Aset

Ukuran deploy pernah mencapai 40 MB dan sekarang 7,1 MB. Jangan membalikkannya.

- Ilustrasi memakai **WebP** maksimal 1000 px, bukan PNG penuh. `Illustration` di `components/ui.jsx` menyusun path-nya dan punya fallback `onError`.
- Audio latar: lo-fi 96 kb/s stereo, hujan 56 kb/s mono, masing-masing di bawah 2 MB. `audio.js` merotasi antar aset pada event `ended`, jadi klip pendek justru cocok.
- Sebelum menambah aset, cek `du -sh dist` sebelum dan sesudah.

## Service worker

`public/sw.js` memakai **cache-first** untuk `/assets/` dan **network-first** untuk dokumen. Permintaan lintas-origin dilewatkan, dan respons non-ok tidak disimpan.

Naikkan nama `CACHE` setiap kali aset statis diganti, supaya cache lama pengguna aktif tersapu. Sekarang `taskflow-v5`.

## Perintah

```bash
npm test
npm run lint
npm run dev
npm run build
```

PowerShell di mesin ini bisa memblokir `npm.ps1`. Alternatif yang selalu jalan:

```bash
node node_modules/vitest/vitest.mjs run --config vitest.config.js
node node_modules/eslint/bin/eslint.js .
```

## Tes

Vitest memuat `src/**/*.test.js` di environment `node` dan `src/**/*.test.jsx` di `jsdom` lewat `environmentMatchGlobs`. Tes komponen memakai `@testing-library/react`; auto-cleanup tidak aktif karena `globals` tidak dinyalakan, jadi `src/test/setup.js` memanggil `cleanup()` sendiri.

### Yang wajib hijau

- Migrasi workspace v6 → v7 tidak menghapus teks, tugas, course, sesi, atau histori fokus yang sudah ada.
- Distraction Tracker membedakan status `distracted` dari `paused`; waktu distraksi tidak masuk `activeSeconds`.
- Validasi URL folder materi dan label minggu semester.
- Soundscape tidak autoplay dan tidak berbunyi ketika preference bunyi mati.
- Recurrence weekly membuat salinan `dueDate + 7` dan mengarsipkan yang lama.
- Filter course/type/arsip.
- Interval semester: tanggal di dalam/luar batas, analitik `scope: 'semester'` vs `'all'`, dan tugas tanpa deadline tetap terhitung.
- Reminder mengabaikan tugas selesai/arsip dan menghormati offset jam.
- `getDisplayStreak` sepakat dengan `updateStreak`: streak yang ditampilkan putus juga direset olehnya.
- Snapshot menyimpan keadaan **sebelum** reset dan import, di key terpisah, tanpa mengubah revision.
- Setiap state Focus Run memunculkan tombol dan label timer yang benar (`FocusControls.test.jsx`).
- Menunda tugas hanya menggeser `dueDate`; carry-over mingguan menggeser tepat tujuh hari.
- `npm run build` menghasilkan keenam entry HTML.

## Jebakan yang sudah pernah menggigit

Ditulis di sini supaya tidak terulang.

- **`Number(null)` bernilai `0` dan lolos `Number.isFinite`.** Ini pernah membuat `dateKeyFromTimestamp(null)` menghasilkan `'1970-01-01'`, sehingga seluruh tugas tanpa deadline hilang dari Analitik bermode semester. Tolak `null`/`undefined`/`''` secara eksplisit sebelum menyentuh `Number()`.
- **Hook tidak boleh dipanggil di sisi kanan `||` atau `&&`.** Pernah terjadi pada `useReducedMotion` di FocusPage dan mematikan halaman fokus ketika preferensi motion berubah dari tab lain. ESLint `react-hooks/rules-of-hooks` sekarang menjaganya.
- **`progress.currentStreak` hanya diperbarui saat ada aktivitas.** Untuk tampilan, selalu pakai `getDisplayStreak`, jangan membaca field-nya langsung.
- **Id DOM statis di komponen yang dipakai berkali-kali.** `Modal` sempat memakai `id="dialog-title"` tetap padahal halaman Fokus memasang empat dialog sekaligus. Pakai `useId()`.
- **Verifikasi visual di panel pratinjau tidak dapat diandalkan.** Ketika panel tersembunyi, `requestAnimationFrame` berhenti total sehingga animasi keluar `AnimatePresence` tidak pernah selesai dan komponennya tampak beku di state lama. Itu artefak alat, bukan bug aplikasi. Verifikasi lewat DOM dan tes komponen, bukan screenshot.

## Gaya UI

Token di `base.css`. Dark mode: `html[data-theme="dark"]`. Preferensi `theme`: `light` | `dark` | `system`.
Mobile: bottom nav di ≤760px. Target sentuh ≥44px.
Motion: Motion for React untuk layout dan state UI, Anime.js hanya untuk reward/hero. Audio lokal memakai Web Audio dan tidak boleh memanggil jaringan.

Baris JSX dijaga di bawah 600 karakter. Kalau sebuah blok melewati itu, ekstrak jadi komponen bernama di `components/<area>/` dan pindahkan markup beserta className **verbatim** supaya CSS tidak tersentuh.

Label yang punya aturan (prioritas, jenis, pertemuan) diambil dari konstanta atau helper, bukan diketik ulang: `PRIORITY_LABELS`, `TASK_TYPE_LABELS`, `WEEKDAY_LABELS` di `storage.js`, serta `getMeetingBadge` dan `getMeetingLabel` di `domain.js`.
