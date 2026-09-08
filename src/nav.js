import { BarChart3, CalendarDays, LayoutDashboard, ListChecks, Settings, Target } from 'lucide-react';

export const PAGE_META = {
  home: { label: 'Beranda', eyebrow: 'Ruang fokus pribadi', title: 'Pilih satu hal. Mulai dari sana.', description: 'TaskFlow membantu kamu mengubah daftar tugas menjadi progres yang terasa nyata.' },
  tasks: { label: 'Tugas', eyebrow: 'Quest board', title: 'Semua misi, lebih mudah dipilih.', description: 'Tangkap tugas dengan cepat, pecah jadi subtask, lalu tempelkan ke mata kuliah.' },
  calendar: { label: 'Kalender', eyebrow: 'Semester', title: 'Lihat minggu kuliah dalam satu layar.', description: 'Deadline, ujian, dan jadwal mata kuliah berkumpul di kalender yang sama.' },
  focus: { label: 'Fokus', eyebrow: 'Focus Run', title: 'Satu sesi. Satu misi.', description: 'Singkirkan noise dan beri waktu yang utuh untuk pekerjaan yang sedang kamu pilih.' },
  analytics: { label: 'Analitik', eyebrow: 'Perjalananmu', title: 'Lihat ritme, bukan skor kosong.', description: 'Baca pola kerja dari tugas, mata kuliah, dan sesi fokus yang benar-benar kamu jalankan.' },
  settings: { label: 'Pengaturan', eyebrow: 'Ruang kerjamu', title: 'Atur TaskFlow sesuai caramu.', description: 'Mata kuliah, tema, pengingat, dan data tetap berada di perangkat ini.' }
};

export const NAV_ITEMS = [
  { href: 'index.html', page: 'home', label: 'Beranda', Icon: LayoutDashboard },
  { href: 'tasks.html', page: 'tasks', label: 'Tugas', Icon: ListChecks },
  { href: 'calendar.html', page: 'calendar', label: 'Kalender', Icon: CalendarDays },
  { href: 'focus.html?intent=choose', page: 'focus', label: 'Fokus', Icon: Target },
  { href: 'analytics.html', page: 'analytics', label: 'Analitik', Icon: BarChart3 },
  { href: 'settings.html', page: 'settings', label: 'Pengaturan', Icon: Settings }
];

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.page !== 'analytics' && item.page !== 'settings');
