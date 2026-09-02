import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleHelp, History, Sparkles } from 'lucide-react';
import { formatSnapshotLabel, validateProfileInput } from '../lib/domain.js';
import { PROFILE_ROLE_LABELS, PROFILE_ROLES } from '../lib/storage.js';
import { Illustration } from './ui.jsx';

export function ProfileGate({ profile, onComplete, recoverySnapshot = null, onRestoreSnapshot }) {
  const [form, setForm] = useState({ name: profile.name || '', role: profile.role || '', goal: profile.goal || '' });
  const [error, setError] = useState(null);
  const nameRef = useRef(null);
  useEffect(() => { requestAnimationFrame(() => nameRef.current?.focus()); }, []);
  const setField = (field, value) => { setForm((current) => ({ ...current, [field]: value })); if (error?.field === field) setError(null); };
  const submit = (event) => { event.preventDefault(); const validation = validateProfileInput(form); if (validation) { setError(validation); return; } onComplete(form); };
  return <section className="first-run-shell" aria-labelledby="profile-gate-title"><div className="profile-gate"><div className="profile-gate-copy"><p className="eyebrow">Ruang fokus pribadimu</p><h1 id="profile-gate-title">Mulai dari hal yang penting buatmu.</h1><p>TaskFlow akan memakai sedikit konteks ini untuk menyusun langkah yang terasa relevan. Semua informasi hanya disimpan di browser ini.</p><Illustration type="milestone" alt="Ilustrasi memulai perjalanan fokus" className="profile-gate-illustration" /></div><form className="profile-gate-form form-stack" onSubmit={submit}><div><p className="section-kicker">Kenalan sebentar</p><h2>Isi profilmu dulu</h2><p className="muted">Tidak perlu akun. Cukup tiga hal untuk memulai.</p></div><div className="field-group"><label htmlFor="onboarding-name">Nama panggilan</label><input ref={nameRef} id="onboarding-name" className="input" value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={40} autoComplete="nickname" aria-invalid={error?.field === 'name'} aria-describedby="onboarding-name-error" placeholder="Contoh: Vio" /><p id="onboarding-name-error" className="field-error" role="alert">{error?.field === 'name' ? error.message : ''}</p></div><div className="field-group"><label htmlFor="onboarding-role">Peranmu</label><select id="onboarding-role" className="input" value={form.role} onChange={(event) => setField('role', event.target.value)} aria-invalid={error?.field === 'role'}><option value="">Pilih peran</option>{PROFILE_ROLES.map((role) => <option key={role} value={role}>{PROFILE_ROLE_LABELS[role]}</option>)}</select><p className="field-error" role="alert">{error?.field === 'role' ? error.message : ''}</p></div><div className="field-group"><label htmlFor="onboarding-goal">Tujuan utama saat ini</label><textarea id="onboarding-goal" className="input" value={form.goal} onChange={(event) => setField('goal', event.target.value)} maxLength={120} aria-invalid={error?.field === 'goal'} aria-describedby="onboarding-goal-error" placeholder="Contoh: Menyelesaikan proyek akhir dengan lebih teratur" /><p id="onboarding-goal-error" className="field-error" role="alert">{error?.field === 'goal' ? error.message : ''}</p></div><button className="btn btn-primary btn-large" type="submit"><Sparkles size={18} />Mulai ruang fokus</button><p className="form-note"><CircleHelp size={14} />Profil ini tidak dikirim ke mana pun.</p>{recoverySnapshot && <p className="form-note"><History size={14} />Mereset tanpa sengaja? <button className="text-link" type="button" onClick={onRestoreSnapshot}>Pulihkan {recoverySnapshot.data.tasks.length} tugas dari snapshot {formatSnapshotLabel(recoverySnapshot)}</button></p>}</form></div></section>;
}

const TOUR_STEPS = [
  { title: 'Ini ruang fokusmu', description: 'Beranda merangkum misi hari ini, countdown deadline, dan langkah yang paling masuk akal untukmu.', selectors: ['.home-hero-preview', '[data-tour="recommendations"]', '[data-tour="tasks"]', '.home-hero'] },
  { title: 'Tempel tugas ke mata kuliah', description: 'Daftarkan mata kuliah di Pengaturan, lalu tempel tugas, ujian, dan proyek ke sana agar kalender dan filter jadi rapi.', selectors: ['[data-tour="courses"]', '[data-tour="settings"]', '.task-capture'] },
  { title: 'Tangkap tugas tanpa ribet', description: 'Gunakan halaman Tugas untuk menulis cepat, pecah subtask, atau menambahkan deadline dan jam.', selectors: ['.task-capture', '.home-hero [data-tour="tasks"]', '[data-tour="tasks"]'] },
  { title: 'Baca minggu kuliah', description: 'Kalender menampilkan deadline, ujian, dan jadwal kuliah dalam satu bulan.', selectors: ['[data-tour="calendar"]', '.calendar-month', '.home-agenda'] },
  { title: 'Jalankan satu sesi fokus', description: 'Focus Run memberi waktu utuh untuk satu misi, dengan durasi custom dan pengingat selesai.', selectors: ['.mission-card', '.home-hero-preview', '.focus-stage', '[data-tour="focus"]'] },
  { title: 'Baca ritmemu', description: 'Analitik menunjukkan pola dari tugas, mata kuliah, dan sesi yang kamu selesaikan.', selectors: ['.summary-lines', '.analytics-stats', '[data-tour="analytics"]'] }
];

export function OnboardingTour({ onComplete, onSkip }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const cardRef = useRef(null);
  const step = TOUR_STEPS[stepIndex];
  useEffect(() => {
    const refresh = () => {
      const target = step.selectors.map((selector) => document.querySelector(selector)).find((element) => {
        const rect = element?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
      });
      if (!target) { setTargetRect(null); return; }
      const rectBeforeScroll = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isOutsideViewport = rectBeforeScroll.top < 72 || rectBeforeScroll.bottom > viewportHeight - 170;
      if (isOutsideViewport) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    const frame = requestAnimationFrame(refresh);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', refresh); window.removeEventListener('scroll', refresh, true); };
  }, [step]);
  useEffect(() => {
    cardRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onSkip(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSkip, stepIndex]);
  const next = () => { if (stepIndex === TOUR_STEPS.length - 1) onComplete(); else setStepIndex((current) => current + 1); };
  return <div className="tour-layer"><div className="tour-overlay" aria-hidden="true" />{targetRect && <div className="tour-spotlight" aria-hidden="true" style={{ top: targetRect.top - 8, left: targetRect.left - 8, width: targetRect.width + 16, height: targetRect.height + 16 }} />}<section ref={cardRef} className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" tabIndex="-1"><div className="tour-card-topline"><span className="section-kicker">Panduan TaskFlow</span><span>{stepIndex + 1} / {TOUR_STEPS.length}</span></div><h2 id="tour-title">{step.title}</h2><p>{step.description}</p><div className="tour-progress" aria-hidden="true"><span style={{ width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%` }} /></div><div className="tour-actions"><button className="btn btn-ghost" type="button" onClick={onSkip}>Lewati tutorial</button><div><button className="btn btn-secondary" type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0}>Kembali</button><button className="btn btn-primary" type="button" onClick={next}>{stepIndex === TOUR_STEPS.length - 1 ? 'Selesai' : 'Berikutnya'}<ArrowRight size={16} /></button></div></div></section></div>;
}
