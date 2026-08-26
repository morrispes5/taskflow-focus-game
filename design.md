# TaskFlow Design System dan Product Direction

Status: Baseline v2 (schemaVersion 5)
Target: ruang kerja semester offline untuk pelajar dan mahasiswa
Platform: web responsive, mobile-first, PWA
Bahasa UI: Bahasa Indonesia
Kontrak data: lihat `docs/schema.md`. Panduan AI: `AGENTS.md`.

## 1. Ringkasan Produk

TaskFlow bukan hanya daftar tugas. TaskFlow adalah ruang kerja fokus yang membantu pengguna:

1. Memilih satu tugas penting.
2. Menjalankan sesi fokus.
3. Menyelesaikan tugas dengan konfirmasi yang jelas.
4. Mendapatkan reward kecil yang terasa memuaskan.
5. Melihat perkembangan tanpa dashboard yang ramai.

Konsep utama produk adalah **Focus Run**. Setiap tugas dapat menjadi misi yang dikerjakan dalam sesi fokus, tetapi pengguna tetap memegang kendali untuk menandai tugas sebagai selesai.

## 2. Keputusan Produk

### Target pengguna

- Pelajar dan mahasiswa yang mengelola tugas kuliah, proyek, belajar mandiri, dan pekerjaan pribadi.
- Pengguna yang membutuhkan arah tindakan berikutnya, bukan sekadar banyak angka.
- Pengguna yang ingin bekerja dengan tenang tanpa sistem produktivitas yang terasa menghakimi.

### Kepribadian produk

- Tenang, tajam, dewasa, dan suportif.
- Memberi energi saat pengguna mulai bekerja.
- Menjadi hening saat pengguna sedang fokus.
- Merayakan progres secara singkat, bukan memaksa perhatian.

### Prinsip anti-AI-slop

- Tidak ada gradient besar, blob dekoratif, glow acak, atau ornamen yang tidak membantu tugas.
- Tidak ada kartu berlapis-lapis hanya untuk mengisi ruang.
- Tidak ada statistik buatan atau metrik yang tidak berasal dari data nyata.
- Tidak ada animasi bounce yang dipasang pada semua elemen.
- Setiap animasi harus menjelaskan perubahan status, arah perhatian, atau hasil tindakan.
- Gunakan copy yang konkret dalam Bahasa Indonesia, bukan slogan produktivitas generik.
- Gunakan satu signature moment untuk tindakan penting, bukan banyak efek kecil sekaligus.
- Prioritaskan hierarchy, whitespace, dan feedback yang jelas sebelum dekorasi.

## 3. Core Loop Focus Run

### Alur utama

1. Pengguna membuka Beranda.
2. TaskFlow menampilkan satu misi berikutnya berdasarkan deadline, prioritas, dan status.
3. Pengguna memilih `Mulai Focus Run`.
4. Pengguna memilih preset 25/5, 50/10, atau durasi custom.
5. Timer masuk ke state fokus.
6. Pengguna dapat pause, melanjutkan, atau mengakhiri sesi lebih awal.
7. Setelah sesi fokus selesai, tampilkan recap durasi dan tindakan berikutnya.
8. Pengguna menandai tugas selesai secara manual.
9. TaskFlow memberi XP, memperbarui streak, dan menampilkan reward singkat.

### State Focus Run

- `ready`: tugas terpilih, timer belum dimulai.
- `focusing`: timer aktif dan kontrol utama adalah pause atau selesai.
- `paused`: timer berhenti, pengguna dapat melanjutkan atau mengakhiri sesi.
- `break`: sesi fokus selesai dan timer istirahat aktif.
- `completed`: sesi selesai, recap dan reward terlihat.
- `abandoned`: sesi dihentikan sebelum selesai; durasi tetap dicatat, tetapi tidak mendapat bonus sesi penuh.

Sesi fokus tidak otomatis menandai tugas selesai. Hal ini mencegah aplikasi mengklaim pekerjaan selesai hanya karena timer berakhir.

## 4. Gamifikasi Ringan

Gamifikasi digunakan sebagai feedback, bukan kompetisi.

### XP default

- Menyelesaikan tugas: `10 XP`.
- Bonus prioritas low: `0 XP`.
- Bonus prioritas medium: `3 XP`.
- Bonus prioritas high: `5 XP`.
- Sesi fokus selesai: `1 XP` untuk setiap 10 menit fokus aktif.
- Bonus konsistensi harian: `5 XP` sekali per hari setelah aktivitas produktif pertama.

XP tidak pernah berkurang. Membuka kembali tugas tidak membatalkan XP yang sudah diperoleh.

### Level

```text
level = floor(totalXp / 100) + 1
```

Level hanya berfungsi sebagai penanda perjalanan. Tidak ada fitur terkunci, hukuman, leaderboard, atau tekanan sosial pada versi pertama.

### Streak

- Hari produktif adalah hari lokal ketika pengguna menyelesaikan tugas atau menyelesaikan sesi fokus.
- Aktivitas pada hari berikutnya menaikkan streak.
- Jeda lebih dari satu hari mengatur streak aktif kembali ke `1`.
- Streak ditampilkan sebagai konteks, bukan ukuran nilai diri pengguna.

## 5. Arsitektur Informasi

Navigasi utama:

- **Beranda**: misi berikutnya, agenda hari ini, countdown, dan progres hari ini.
- **Tugas**: quest board, subtask, filter mata kuliah, arsip.
- **Kalender**: deadline, ujian, dan jadwal kuliah per bulan.
- **Fokus**: Focus Run yang sedang berjalan atau sesi baru.
- **Analitik**: perjalanan produktivitas per mata kuliah dan ringkasan data.
- **Pengaturan**: mata kuliah, semester, profil, tema, pengingat, backup, dan reset data.

Focus Run dapat dibuka dari Beranda atau Tugas, tetapi memiliki halaman `focus.html` sendiri agar mode fokus tidak terasa seperti modal biasa.

## 6. Konsep Setiap Halaman

### Beranda

Tujuan: menjawab pertanyaan "Apa yang harus aku kerjakan sekarang?"

Elemen utama:

- Greeting singkat dan personal.
- `Misi berikutnya` sebagai fokus utama viewport.
- Deadline, prioritas, kategori, dan estimasi sesi.
- Tombol utama `Mulai Focus Run`.
- Progress hari ini: jumlah tugas selesai, menit fokus, XP, dan streak.
- Daftar tugas berikutnya maksimal lima item.
- Empty state yang mengarahkan pengguna membuat tugas atau merencanakan fokus.

Beranda tidak menggunakan hero marketing atau dashboard penuh kartu. Misi aktif harus menjadi sinyal terbesar pada layar.

### Tugas

Tujuan: menangkap, mengatur, dan memilih misi.

Elemen utama:

- Quick add untuk membuat tugas tanpa mengganggu alur.
- Tombol `Tambah detail` untuk deadline, prioritas, dan kategori.
- Quest row dengan checkbox, judul, metadata, reward, edit, dan hapus.
- Search, filter status, filter prioritas, filter kategori, dan sort.
- Aksi `Mulai fokus` pada tugas aktif.
- State kosong terpisah untuk belum ada tugas, hasil pencarian kosong, tugas aktif kosong, dan tugas selesai kosong.

### Fokus

Tujuan: mengurangi gangguan dan menjaga satu pekerjaan tetap terlihat.

Elemen utama:

- Nama tugas aktif.
- Timer besar tetapi tidak memenuhi seluruh layar secara berlebihan.
- Progress sesi berbasis waktu.
- Status teks yang jelas: `Sedang fokus`, `Dijeda`, `Waktu istirahat`, atau `Sesi selesai`.
- Kontrol utama dengan target sentuh minimal 44px.
- Link keluar yang tetap aman dan tidak mudah terpencet.
- Recap setelah sesi selesai: durasi aktif, status tugas, XP, dan tindakan berikutnya.

### Analitik

Tujuan: membantu pengguna membaca pola, bukan mengejar skor abstrak.

Tampilkan:

- Completion rate.
- Jumlah tugas selesai dan aktif.
- Tugas terlambat.
- Penyelesaian tepat waktu.
- Total menit fokus.
- Sesi fokus selesai.
- Ringkasan per kategori.
- Ringkasan per prioritas.
- Perjalanan tujuh hari yang berasal dari aktivitas nyata.

Jika belum ada data, tampilkan penjelasan singkat dan tombol menuju Tugas. Jangan menampilkan skor produktivitas buatan.

### Pengaturan

Kelompokkan menjadi:

- Profil pengguna.
- Preferensi Focus Run.
- Preferensi tampilan dan motion.
- Backup dan pemulihan data.
- Zona berbahaya.

Preferensi motion minimal memiliki pilihan `Penuh`, `Ringkas`, dan mengikuti `prefers-reduced-motion` perangkat.

## 7. Design Tokens

### Warna

```css
--color-ink: #17202f;
--color-ink-muted: #697386;
--color-paper: #f7f8f5;
--color-surface: #ffffff;
--color-surface-muted: #eef2ef;
--color-line: #dfe6e1;
--color-cobalt: #2864f0;
--color-cobalt-dark: #1745b5;
--color-mint: #18b892;
--color-mint-soft: #e3f7f0;
--color-amber: #c98218;
--color-coral: #d95454;
--color-focus: #0f8fbd;
```

Aturan penggunaan:

- Cobalt hanya untuk tindakan utama dan link penting.
- Mint untuk progres positif dan reward.
- Amber untuk deadline dekat atau perhatian.
- Coral untuk terlambat, error, atau tindakan berbahaya.
- Status harus memiliki label atau ikon pendamping, bukan warna saja.

### Typography

- Font utama: `Inter`, `ui-sans-serif`, `system-ui`, sans-serif.
- Heading: tebal, rapat, dan singkat.
- Body: nyaman dibaca dengan line-height sekitar 1.5.
- Angka timer boleh lebih besar, tetapi tidak memakai ukuran hero marketing.
- Letter spacing tetap `0`.

### Layout dan komponen

- Mobile-first.
- Lebar konten maksimum sekitar 1180px.
- Spacing berbasis kelipatan 4px.
- Card radius maksimal 8px untuk komponen berulang.
- Modal boleh memakai radius sampai 12px.
- Shadow tipis dan fungsional, bukan efek mengambang berat.
- Tombol dan kontrol interaktif memiliki area sentuh minimal 44px.
- Hindari card di dalam card. Gunakan section full-width dengan inner layout yang jelas.

## 8. Motion System

Motion harus terasa seperti satu bahasa, bukan kumpulan efek.

### Motion tokens

```css
--motion-instant: 0ms;
--motion-fast: 120ms;
--motion-base: 180ms;
--motion-smooth: 280ms;
--motion-cinematic: 420ms;
--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-emphasis: cubic-bezier(0.16, 1, 0.3, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

### Choreography

- Page enter: opacity dan translate kecil, maksimal 280ms.
- Task list: stagger 24ms per item, maksimal lima item pertama.
- Modal: opacity plus translateY kecil dengan `ease-emphasis`, maksimal 280ms.
- Checkbox selesai: perubahan check, judul, dan progress dilakukan berurutan dalam satu signature moment.
- Reward: XP naik dengan angka yang bergerak singkat dan progress bar morph; tanpa confetti penuh layar.
- Focus Run: transisi dari `ready` ke `focusing` menggunakan perubahan layout yang tenang, bukan zoom dramatis.
- Timer: angka tidak boleh melompat ukuran atau mengubah layout ketika detik berubah.
- Exit: gunakan opacity dan translate kecil; jangan menahan pengguna dengan animasi panjang.

### Aturan motion

- Animasi hanya berjalan ketika ada perubahan state atau perpindahan perhatian.
- Tidak ada infinite animation pada elemen dekoratif.
- Tidak ada parallax, cursor-following, atau background bergerak pada versi pertama.
- Jangan menganimasikan `width`, `height`, atau layout yang menyebabkan content jump jika transform atau opacity dapat digunakan.
- `prefers-reduced-motion: reduce` menghapus stagger, scale, dan transform besar tetapi tetap mempertahankan perubahan status dan fokus keyboard.
- Feedback harus tetap terbaca tanpa motion.

### Strategi teknis

TaskFlow menggunakan React + Vite multi-page agar Beranda, Tugas, Fokus, Analitik, dan Pengaturan tetap terasa sebagai area kerja yang jelas. Motion for React menangani transisi/layout, sedangkan Anime.js dipakai untuk sequence reward dan entrance yang singkat. Data tetap offline melalui `localStorage`.

## 9. Data Contract Tahap Berikutnya

Key tugas yang sudah ada tetap dipertahankan:

```js
taskflow_tasks = [
  {
    id: Number,
    text: String,
    completed: Boolean,
    createdAt: Number,
    updatedAt: Number,
    completedAt: Number | null,
    dueDate: String | null,
    priority: 'low' | 'medium' | 'high',
    category: String | null,
    estimateMinutes: 15 | 25 | 50 | 90
  }
]
```

Tambahkan penyimpanan terpisah agar data tugas lama tetap aman:

```js
taskflow_progress = {
  totalXp: Number,
  level: Number,
  currentStreak: Number,
  bestStreak: Number,
  lastActiveDate: String | null,
  lastConsistencyRewardDate: String | null,
  rewardedTaskIds: Number[],
  milestones: String[]
}
```

```js
taskflow_focus_sessions = [
  {
    id: Number,
    taskId: Number,
    plannedMinutes: Number,
    activeSeconds: Number,
    status: 'completed' | 'abandoned',
    startedAt: Number,
    endedAt: Number | null,
    rewardApplied: Boolean
  }
]

taskflow_focus_active = {
  taskId: Number,
  plannedMinutes: Number,
  breakMinutes: Number,
  status: 'focusing' | 'paused' | 'break',
  activeSeconds: Number,
  runningSince: Number | null,
  sessionStartedAt: Number,
  breakEndsAt: Number | null
} | null
```

Workspace baru tidak membuat demo task. Profil dan status first-run disimpan terpisah, tetap lokal, dan tidak mengubah workspace lama:

```js
taskflow_username = String
taskflow_role = 'pelajar' | 'mahasiswa' | 'profesional' | 'lainnya'
taskflow_goal = String
taskflow_tagline = String

taskflow_onboarding = {
  profileCompleted: Boolean,
  tutorialCompleted: Boolean,
  tutorialSkipped: Boolean,
  completedAt: Number | null
}
```

Rekomendasi dibuat secara rules-based dari role dan goal di browser. Saran dapat diedit dan dipilih sebagian sebelum dibuat menjadi tugas.

Ketentuan data:

- Gunakan timezone lokal browser untuk hari dan streak.
- Data rusak diabaikan dengan fallback aman, bukan menghapus seluruh storage.
- Analitik selalu dihitung dari tugas dan sesi yang tersimpan.
- Export dan import harus memasukkan tugas, progress, sesi, profil, dan preferensi.
- Tidak ada data pengguna yang dikirim ke server.

## 10. Komponen Utama

- `AppShell`: header, navigasi, konten utama, dan status global.
- `FocusMission`: misi aktif di Beranda.
- `QuestRow`: representasi tugas di Tugas.
- `ProgressMeter`: progress tugas, XP, dan sesi.
- `FocusTimer`: timer dengan state yang eksplisit.
- `RewardToast`: feedback XP atau milestone.
- `EmptyState`: state kosong dengan satu tindakan utama.
- `TaskDialog`: tambah dan edit tugas.
- `ConfirmDialog`: tindakan destruktif.
- `MotionPreference`: pengaturan tingkat motion.

Setiap komponen harus memiliki state default, hover, focus-visible, disabled, error, empty, dan reduced-motion bila relevan.

## 11. Aksesibilitas dan Responsive UX

- Semua input memiliki label yang terbaca screen reader.
- Semua tombol ikon memiliki `aria-label` dan tooltip untuk konteks desktop.
- Fokus keyboard terlihat dengan `:focus-visible`.
- Dialog mengembalikan fokus ke trigger setelah ditutup.
- Timer memiliki status teks yang dapat dibaca screen reader.
- Toast tidak menjadi satu-satunya cara menyampaikan reward atau error.
- Layout diuji pada lebar sekitar 390px dan 1280px.
- Navigasi mobile memiliki target sentuh minimal 44px.
- Tidak ada teks, badge, tombol, atau timer yang saling menimpa.

## 12. Urutan Implementasi

### Fase 1: kontrak desain

- Selesaikan dan review dokumen ini.
- Pastikan seluruh nama halaman, istilah, state, token, dan aturan motion konsisten.

### Fase 2: fondasi visual

- Satukan token di `base.css`.
- Rapikan komponen global di `components.css`.
- Bangun AppShell, navigasi, typography, button, form, dialog, badge, dan empty state.

### Fase 3: data dan Focus Run

- Tambahkan progress dan focus session storage secara backward-compatible.
- Buat `focus.html` dan state machine Focus Run.
- Hubungkan XP, streak, reward, dan recap dengan data nyata.

### Fase 4: redesign semua halaman

- Redesign Beranda, Tugas, Analitik, dan Pengaturan dengan sistem yang sama.
- Tambahkan motion choreography per state.
- Pertahankan CRUD tugas dan validasi yang sudah ada.

### Fase 5: validasi

- Jalankan `node --check script.js`.
- Jalankan `git diff --check` jika repository sudah memiliki metadata Git yang valid.
- Uji localStorage lama dan data baru.
- Uji alur Focus Run dari awal sampai reward.
- Uji keyboard, reduced-motion, mobile 390px, dan desktop 1280px.

## 13. Acceptance Checklist

- Pengguna tahu tugas berikutnya tanpa membaca banyak kartu.
- Focus Run dapat dimulai dari Beranda dan Tugas.
- Pause, lanjut, selesai, dan batal memiliki feedback yang berbeda.
- Menyelesaikan tugas memperbarui XP, streak, Beranda, dan Analitik.
- Semua angka berasal dari data nyata.
- Animasi terasa premium tetapi tidak mengganggu pekerjaan.
- Reduced-motion tetap membuat aplikasi lengkap dan dapat dipakai.
- Tampilan tidak terasa seperti template dashboard generik.
- Data tugas lama tetap muncul setelah fitur baru diterapkan.
- Mata kuliah, kalender, dark mode, dan PWA tersedia tanpa login.

## 14. Baseline v2 — ruang kerja semester

Tambahan yang tidak mengubah kepribadian produk:

- Mata kuliah adalah entitas, bukan string kategori.
- Tugas boleh punya jam, tipe, catatan, subtask, tautan, pin, arsip, dan pengulangan harian/mingguan.
- Kalender membaca `dueDate`/`dueTime` dan `course.schedule`.
- Pengingat browser dan chime Focus Run hanya berjalan saat aplikasi terbuka.
- Tema `light` | `dark` | `system` memakai token yang sama di `base.css`.
- Tidak ada backend. Tidak ada wipe data saat migrasi ke schema 5.
