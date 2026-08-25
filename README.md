# TaskFlow

TaskFlow adalah aplikasi manajemen tugas offline untuk pelajar dan mahasiswa. Pengalaman utamanya bukan hanya menambah lalu mencentang tugas, tetapi memilih satu misi, menjalankan sesi Focus Run, dan melihat progres dari aktivitas nyata.

Repository yang disiapkan untuk publikasi: `taskflow-focus-game`.

## Fitur

- Beranda dengan misi harian, statistik, XP, level, streak, dan milestone.
- Task board dengan quick add, tambah detail, edit, hapus, validasi, pencarian, filter, dan pengurutan.
- Focus Run 25 atau 50 menit dengan jeda, lanjutkan, akhiri, reward XP, dan catatan sesi.
- Analitik completion rate, tugas aktif, keterlambatan, fokus, penyelesaian tepat waktu, kategori, prioritas, dan perjalanan tujuh hari.
- Pengaturan profil, preferensi motion, preset fokus, export JSON, import JSON tervalidasi, dan reset dengan konfirmasi.
- First-run flow tanpa login: workspace baru dimulai kosong, profil wajib diisi, lalu tutorial interaktif dan rekomendasi task offline muncul sesuai tujuan pengguna.
- Rekomendasi personal bersifat rules-based, dapat diedit dan dipilih sebagian sebelum masuk ke task board.
- Data tersimpan lokal melalui `localStorage`, sehingga tidak membutuhkan login atau backend.
- Motion memakai Motion for React untuk transisi/layout dan Anime.js untuk sequence reward yang kecil dan terarah.
- Ilustrasi state tersimpan lokal di `public/assets/illustrations/` agar aplikasi tetap dapat berjalan offline.

## Struktur

```text
foldervio/
├── index.html
├── tasks.html
├── focus.html
├── analytics.html
├── settings.html
├── src/
│   ├── app.jsx
│   ├── main.jsx
│   ├── lib/
│   │   ├── domain.js
│   │   └── storage.js
│   └── motion/
│       └── anime.js
├── public/assets/illustrations/
├── base.css
├── components.css
├── design.md
├── package.json
└── vite.config.js
```

## Menjalankan

Pastikan Node.js tersedia, lalu jalankan:

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya `http://127.0.0.1:5173/`.

## GitHub Pages

Workflow di `.github/workflows/deploy.yml` membangun folder `dist` dan menerbitkannya ke GitHub Pages setiap kali branch `main` menerima push. Setelah repository GitHub dibuat dan Pages menggunakan source `GitHub Actions`, deployment berjalan otomatis.

## Verifikasi

```bash
npm test
npm run build
```

`npm test` menjalankan unit test untuk domain tugas, statistik, streak, validasi, migrasi, dan backup. `npm run build` memverifikasi seluruh entry page multi-page React.

## Penyimpanan Lokal

TaskFlow mempertahankan key utama `taskflow_tasks` dan memigrasikan data tugas lama secara backward-compatible. Key tambahan yang digunakan:

- `taskflow_progress`
- `taskflow_focus_sessions`
- `taskflow_focus_active`
- `taskflow_preferences`
- `taskflow_username`
- `taskflow_tagline`
- `taskflow_role`
- `taskflow_goal`
- `taskflow_onboarding`

Lihat [design.md](design.md) untuk keputusan produk, sistem visual, kontrak data, motion, dan batasan fitur fase pertama.
