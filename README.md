# TaskFlow

TaskFlow adalah ruang kerja fokus **offline** untuk pelajar dan mahasiswa. Pengalaman utamanya bukan hanya menambah lalu mencentang tugas, tetapi memilih satu misi, menjalankan sesi Focus Run, dan melihat progres dari aktivitas nyata — termasuk mata kuliah, kalender deadline, dan subtask.

Live: [morrispes5.github.io/taskflow-focus-game](https://morrispes5.github.io/taskflow-focus-game/)

Repository: `taskflow-focus-game` (v6).

## Fitur

- Beranda dengan misi harian, agenda hari ini, countdown deadline, XP, level, streak, dan progres mata kuliah.
- Task board dengan quick add, subtask, catatan, tautan, pin, arsip, duplikat, filter mata kuliah/jenis, dan tugas berulang.
- Mata kuliah sebagai entitas: warna, kode, dosen, SKS, jadwal kuliah, dan link folder materi/Google Drive.
- Kalender bulan untuk deadline, ujian, dan jadwal kelas.
- Focus Desk 25, 50, atau durasi custom, dengan brief tugas, link materi, subtask, catatan sesi, recap, feedback audio, soundscape lokal, dan notifikasi selesai.
- Analitik completion rate, per mata kuliah, jenis tugas, keterlambatan, dan perjalanan tujuh hari.
- Pengaturan profil, semester, tema (terang/gelap/sistem), motion, bunyi, pengingat browser, export/import JSON, dan reset.
- First-run tanpa login: profil, tutorial, rekomendasi rules-based, lalu ajakan opsional menambah mata kuliah.
- Data tersimpan lokal melalui IndexedDB. Tidak ada akun atau backend.
- Dapat dipasang sebagai PWA. Pengingat hanya berjalan saat TaskFlow terbuka.

## Struktur

```text
foldervio/
├── index.html tasks.html focus.html calendar.html analytics.html settings.html
├── src/
│   ├── app.jsx
│   ├── main.jsx
│   ├── nav.js
│   ├── pages/
│   ├── components/
│   ├── lib/          storage.js, domain.js, reminders.js, audio.js
│   └── motion/anime.js
├── public/           ilustrasi, manifest, service worker
├── docs/             schema.md, CHANGELOG.md
├── AGENTS.md
├── design.md
└── vite.config.js
```

## Menjalankan

```bash
npm install
npm run dev
```

Buka alamat Vite, biasanya `http://127.0.0.1:5173/`.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` membangun `dist` dan menerbitkannya ke Pages setiap push ke `main`. `vite.config.js` memakai `base: './'` agar aset relatif di `/taskflow-focus-game/`.

## Verifikasi

```bash
npm test
npm run build
```

`npm test` mencakup domain tugas, mata kuliah, recurrence, kalender, reminder, audio lokal, migrasi schema 6, dan backup. `npm run build` memverifikasi seluruh entry HTML termasuk `calendar.html`.

## Penyimpanan lokal

Setiap perangkat/profil browser punya workspace IndexedDB sendiri. Schema v6 **mengisi field baru** pada data lama dan tidak menghapus tugas yang sudah ada. Backup JSON v4/v5 masih bisa diimport. Link Google Drive hanya disimpan sebagai tautan lokal dan tidak pernah disinkronkan TaskFlow.

Pengguna perangkat bersama dapat memilih **Mulai workspace baru** dari Pengaturan.

Lihat [design.md](design.md), [docs/schema.md](docs/schema.md), dan [AGENTS.md](AGENTS.md) untuk keputusan produk dan kontrak data.
