# TaskFlow — panduan untuk AI dan maintainer

Baca file ini sebelum mengubah kode. Kontrak data ada di `docs/schema.md`. Riwayat perubahan ada di `docs/CHANGELOG.md`. Arah produk ada di `design.md`.

## Apa ini

TaskFlow adalah aplikasi web **offline** untuk pelajar/mahasiswa. Tidak ada login, backend, atau sinkron cloud. Deploy ke GitHub Pages dari branch `main`.

Repo: `morrispes5/taskflow-focus-game`
Live: `https://morrispes5.github.io/taskflow-focus-game/`

## Aturan yang tidak boleh dilanggar

- Jangan menambah server, akun, atau kirim data pengguna ke jaringan.
- Jangan menghapus workspace pengguna saat load. Migrasi harus additive.
- Jangan mengganti `base: './'` di `vite.config.js`. Path absolut merusak GitHub Pages di subpath.
- Seluruh kode aktif ada di `src/`. Prototipe `script.js` sudah dihapus; jangan menghidupkannya kembali.
- UI Bahasa Indonesia. Focus Run tetap loop utama: satu misi, satu sesi.
- Jangan membuat dashboard ramai, gradient besar, atau metrik fiktif.

## Arsitektur

Aplikasi React 19 + Vite **multi-page**. Setiap HTML punya `body[data-page]`. `src/app.jsx` merender halaman yang sesuai.

```text
src/
  app.jsx                 hydrate IndexedDB, commit(), tema, reminder, page switch
  main.jsx                mount + register service worker (production only)
  nav.js                  PAGE_META dan NAV_ITEMS
  pages/                  Home, Tasks, Calendar, Focus, Analytics, Settings
  components/             AppShell, dialog, TaskRow, CourseForm, onboarding
  lib/storage.js          IndexedDB, normalize*, backup, schemaVersion
  lib/domain.js           selector murni + applyTaskToggle + recurrence
  lib/reminders.js        banner deadline + Notification
  lib/audio.js            Web Audio feedback dan soundscape lokal
  motion/anime.js         sequence reward/hero
```

Satu pintu tulis: `commit(updater, message)` di `app.jsx`. Domain tidak menyentuh `window` kecuali reminder helpers.

Halaman baru: buat `nama.html` dengan `data-page`, daftarkan di `vite.config.js` `build.rollupOptions.input`, tambah item di `src/nav.js`.

## Data

IndexedDB `taskflow_workspace` / store `workspace` / key `app-data`. Versi object store tetap `1`. Versi aplikasi ada di `schemaVersion` (sekarang **8**).

`normalizeAppData()` selalu mengeluarkan bentuk v8. Record lama tanpa `courses`, `Course.meetings`, `Course.driveUrl`, preferensi soundscape, atau histori distraksi diisi default, **bukan** di-reset.

Backup JSON versi 4/v5/v6/v7 tetap bisa diimport. Backup baru memakai `version: 8`.

## Perintah

```bash
npm test
npm run dev
npm run build
```

PowerShell di mesin ini bisa memblokir `npm.ps1`. Pakai `cmd /c "npm test"` jika execution policy menolak skrip.

## Tes yang wajib hijau

- Migrasi workspace v6 → v7 tidak menghapus teks, tugas, course, sesi, atau histori fokus yang sudah ada.
- Distraction Tracker membedakan status `distracted` dari `paused`; waktu distraksi tidak masuk `activeSeconds`.
- Validasi URL folder materi dan label minggu semester.
- Soundscape tidak autoplay dan tidak berbunyi ketika preference bunyi mati.
- Recurrence weekly membuat salinan `dueDate + 7` dan mengarsipkan yang lama.
- Filter course/type/arsip.
- Interval semester: tanggal di dalam/luar batas, analitik `scope: 'semester'` vs `'all'`.
- Reminder mengabaikan tugas selesai/arsip dan menghormati offset jam.
- `npm run build` menghasilkan `calendar.html` dan entry lama.

## Gaya UI

Token di `base.css`. Dark mode: `html[data-theme="dark"]`. Preferensi `theme`: `light` | `dark` | `system`.
Mobile: bottom nav di ≤760px. Target sentuh ≥44px.
Motion: Motion for React untuk layout dan state UI, Anime.js hanya untuk reward/hero. Audio lokal memakai Web Audio dan tidak boleh memanggil jaringan.
