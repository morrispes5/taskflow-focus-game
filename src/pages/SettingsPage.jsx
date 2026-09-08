import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Download, History, ShieldCheck, Sparkles, Trash2, Upload, Zap } from 'lucide-react';
import { createBackup, parseBackupPayload, validateBackupFile, captureWorkspaceSnapshot, loadWorkspaceSnapshot, DEFAULT_PROFILE, FOCUS_SOUNDSCAPES, FOCUS_SOUNDSCAPE_LABELS } from '../lib/storage.js';
import { makeCourse, validateProfileInput, validateSemesterInput, formatSnapshotLabel, getBackupReminder, getMeetingLabel, getRoleTerminology, getDisplayStreak, makeTask } from '../lib/domain.js';
import { requestNotifyPermission } from '../lib/reminders.js';
import { ConfirmDialog } from '../components/ui.jsx';
import { CourseManager } from '../components/CourseForm.jsx';
import { SemesterForm } from '../components/settings/SemesterForm.jsx';
import { ProfileForm } from '../components/settings/ProfileForm.jsx';
import { SettingsAside } from '../components/settings/SettingsAside.jsx';

export function SettingsPage({ data, commit, updatePreferences, onStartTutorial, onResetWorkspace }) {
  const [profile, setProfile] = useState(data.profile);
  const [semester, setSemester] = useState(data.semester || { name: '', startDate: '', endDate: '' });
  const [status, setStatus] = useState({ text: '', error: false });
  const [confirm, setConfirm] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [persisted, setPersisted] = useState(null);
  const fileRef = useRef(null);
  const terms = getRoleTerminology(data.profile.role);
  const streak = getDisplayStreak(data.progress);
  const backupReminder = getBackupReminder(data);
  useEffect(() => setProfile(data.profile), [data.profile]);
  useEffect(() => setSemester(data.semester || { name: '', startDate: '', endDate: '' }), [data.semester]);
  const refreshSnapshot = () => { loadWorkspaceSnapshot().then(setSnapshot).catch(() => setSnapshot(null)); };
  useEffect(() => { refreshSnapshot(); }, [data]);
  // persisted() tidak memunculkan permintaan izin; hanya persist() yang bisa.
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null)); }, []);
  const saveProfile = (event) => { event.preventDefault(); const validation = validateProfileInput(profile); if (validation) { setStatus({ text: validation.message, error: true }); return; } commit((current) => ({ ...current, profile: { ...current.profile, name: profile.name.trim(), role: profile.role, goal: profile.goal.trim(), tagline: profile.tagline.trim() || DEFAULT_PROFILE.tagline }, onboarding: { ...current.onboarding, profileCompleted: true } })); setStatus({ text: 'Profil tersimpan.', error: false }); };
  const saveSemester = (event) => {
    event.preventDefault();
    const validation = validateSemesterInput(semester);
    if (validation) { setStatus({ text: validation.message, error: true }); return; }
    commit((current) => ({ ...current, semester: semester.name.trim() || semester.startDate || semester.endDate ? { name: semester.name.trim() || 'Semester berjalan', startDate: semester.startDate || null, endDate: semester.endDate || null } : null }));
    setStatus({ text: 'Semester disimpan.', error: false });
  };
  const exportData = () => { const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'taskflow-backup.json'; anchor.click(); URL.revokeObjectURL(url); commit((current) => ({ ...current, preferences: { ...current.preferences, lastBackupAt: Date.now() } })); setStatus({ text: 'Backup berhasil dibuat.', error: false }); };
  const importData = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { validateBackupFile(file); const parsed = parseBackupPayload(JSON.parse(await file.text())); setConfirm({ type: 'import', data: parsed, title: 'Pulihkan backup ini?', message: `Backup berisi ${parsed.tasks.length} tugas dan ${parsed.courses.length} mata kuliah, dan akan menggantikan data lokal saat ini.` }); } catch (error) { setStatus({ text: error.message || 'File JSON tidak bisa dibaca.', error: true }); } event.target.value = ''; };
  const resetAll = () => setConfirm({ type: 'reset', title: 'Mulai workspace baru?', message: 'Tugas, mata kuliah, profil, sesi fokus, XP, preferensi, dan status tutorial di perangkat ini akan dihapus. Kamu akan kembali ke pengisian profil.' });
  const confirmAction = async () => {
    if (confirm?.type === 'import') {
      // Import mengganti seluruh workspace, jadi keadaan sekarang diamankan lebih
      // dulu. captureWorkspaceSnapshot memang tidak pernah melempar.
      try { await captureWorkspaceSnapshot('import'); await commit(() => confirm.data); setStatus({ text: 'Data berhasil dipulihkan. Keadaan sebelumnya tersimpan sebagai snapshot.', error: false }); }
      catch (error) { setStatus({ text: error.message || 'Data belum dapat dipulihkan.', error: true }); }
    }
    if (confirm?.type === 'reset') {
      try { await onResetWorkspace(); setStatus({ text: 'Workspace baru siap digunakan. Keadaan sebelumnya tersimpan sebagai snapshot.', error: false }); }
      catch { setStatus({ text: 'Workspace belum dapat direset.', error: true }); }
    }
    if (confirm?.type === 'snapshot') {
      try { await captureWorkspaceSnapshot('pemulihan'); await commit(() => confirm.data); setStatus({ text: 'Snapshot dipulihkan.', error: false }); }
      catch (error) { setStatus({ text: error.message || 'Snapshot belum dapat dipulihkan.', error: true }); }
    }
    setConfirm(null);
    refreshSnapshot();
  };
  const restoreSnapshot = () => setConfirm({ type: 'snapshot', data: snapshot.data, title: 'Pulihkan snapshot otomatis?', message: `Snapshot ${formatSnapshotLabel(snapshot)} berisi ${snapshot.data.tasks.length} tugas dan akan menggantikan data saat ini. Keadaan sekarang ikut disimpan sebagai snapshot baru.` });
  const enablePersistentStorage = async () => {
    const granted = await navigator.storage?.persist?.().catch(() => false);
    setPersisted(Boolean(granted));
    setStatus(granted
      ? { text: 'Data ditandai persisten. Peramban tidak akan membersihkannya otomatis saat penyimpanan menipis.', error: false }
      : { text: 'Peramban belum memberi status persisten. Export JSON berkala tetap cara paling aman.', error: true });
  };
  const saveCourse = (input, id) => commit((current) => {
    const course = makeCourse(input, id || Date.now());
    const courses = id ? current.courses.map((item) => item.id === id ? { ...item, ...course, id } : item) : [...current.courses, course];
    return { ...current, courses, onboarding: { ...current.onboarding, coursesIntroDismissed: true } };
  }, id ? `${terms.courseLabel} diperbarui.` : `${terms.courseLabel} ditambahkan.`);
  const saveCourseMeetings = (courseId, meetings) => commit((current) => ({
    ...current,
    courses: current.courses.map((item) => item.id === courseId ? { ...item, meetings } : item)
  }), `Daftar ${terms.meetingLabel.toLowerCase()} disimpan.`);
  const createTaskForMeeting = (course, meeting) => {
    const meetingTag = getMeetingLabel(meeting.number, terms);
    const newTask = makeTask({
      text: `${meeting.title || meetingTag}`,
      courseId: course.id,
      meetingNumber: meeting.number,
      url: meeting.driveUrl || null,
      notes: meeting.notes || '',
      type: meeting.number === 8 || meeting.number === 16 ? 'ujian' : 'tugas',
      priority: 'medium',
      estimateMinutes: 25
    });
    commit((current) => ({ ...current, tasks: [newTask, ...current.tasks] }), `Tugas untuk ${meetingTag} dibuat.`);
  };
  const deleteCourse = (course) => commit((current) => ({
    ...current,
    courses: current.courses.filter((item) => item.id !== course.id),
    tasks: current.tasks.map((task) => task.courseId === course.id ? { ...task, courseId: null, meetingNumber: null } : task)
  }), `${terms.courseLabel} dihapus. Tugas terkait tetap ada.`);
  const enableNotify = async () => {
    const permission = await requestNotifyPermission();
    if (permission === 'granted') { updatePreferences({ notify: true }); setStatus({ text: 'Pengingat browser diizinkan. Berjalan saat TaskFlow terbuka.', error: false }); }
    else setStatus({ text: 'Izin notifikasi belum diberikan.', error: true });
  };
  return <section className="settings-layout"><div className="settings-main">
    <article className="card settings-card" id="courses"><div className="card-header"><div><p className="section-kicker">{terms.courseLabel}</p><h2>{terms.isAcademic ? 'Daftar yang sedang kamu jalani' : 'Daftar proyek & area kerja'}</h2></div><span className="card-icon"><Sparkles size={18} /></span></div><CourseManager courses={data.courses} role={data.profile.role} onSave={saveCourse} onDelete={deleteCourse} onSaveMeetings={saveCourseMeetings} onCreateTaskForMeeting={createTaskForMeeting} /></article>
    <SemesterForm semester={semester} onChange={setSemester} onSubmit={saveSemester} />
    <ProfileForm profile={profile} status={status} onChange={setProfile} onSubmit={saveProfile} />
    <article className="card settings-card"><div className="card-header"><div><p className="section-kicker">Tampilan dan fokus</p><h2>Atur rasa interaksinya</h2></div><span className="card-icon"><Zap size={18} /></span></div><div className="settings-options">
      <label className="setting-row"><span><strong>Tema</strong><small>Gelap, terang, atau mengikuti perangkat.</small></span><select className="input setting-select" value={data.preferences.theme} onChange={(event) => updatePreferences({ theme: event.target.value })}><option value="system">Ikuti perangkat</option><option value="light">Terang</option><option value="dark">Gelap</option></select></label>
      <label className="setting-row"><span><strong>Motion</strong><small>Kurangi gerak jika kamu ingin layar lebih tenang.</small></span><select className="input setting-select" value={data.preferences.motion} onChange={(event) => updatePreferences({ motion: event.target.value })}><option value="full">Penuh</option><option value="compact">Ringkas</option><option value="system">Ikuti perangkat</option></select></label>
      <label className="setting-row"><span><strong>Preset Focus Run</strong><small>Durasi awal untuk tombol mulai di Beranda.</small></span><select className="input setting-select" value={data.preferences.focusPreset} onChange={(event) => updatePreferences({ focusPreset: Number(event.target.value) })}><option value="25">25 menit</option><option value="50">50 menit</option></select></label>
      <label className="setting-row"><span><strong>Bunyi selesai sesi</strong><small>Chime singkat saat Focus Run berakhir.</small></span><input type="checkbox" checked={data.preferences.sound} onChange={(event) => updatePreferences({ sound: event.target.checked })} /></label>
      <label className="setting-row"><span><strong>Soundscape Focus Run</strong><small>Musik lokal dari aset aplikasi, tanpa streaming.</small></span><select className="input setting-select" value={data.preferences.focusSoundscape} onChange={(event) => updatePreferences({ focusSoundscape: event.target.value })}>{FOCUS_SOUNDSCAPES.map((soundscape) => <option key={soundscape} value={soundscape}>{FOCUS_SOUNDSCAPE_LABELS[soundscape]}</option>)}</select></label>
      <label className="setting-row"><span><strong>Volume soundscape</strong><small>{data.preferences.focusSoundVolume}% saat sesi fokus berjalan.</small></span><input className="range-input" type="range" min="0" max="100" value={data.preferences.focusSoundVolume} onChange={(event) => updatePreferences({ focusSoundVolume: Number(event.target.value) })} aria-label="Volume soundscape" /></label>
      <label className="setting-row"><span><strong>Pengingat browser</strong><small>Hanya berjalan saat TaskFlow terbuka atau terpasang sebagai aplikasi.</small></span><button className="btn btn-secondary" type="button" onClick={enableNotify}>{data.preferences.notify ? 'Izin sudah aktif' : 'Izinkan pengingat'}</button></label>
    </div></article>
    <article className="card settings-card"><div className="card-header"><div><p className="section-kicker">Bantuan</p><h2>Kenali TaskFlow lagi</h2></div><span className="card-icon"><CircleHelp size={18} /></span></div><p className="muted">Jalankan kembali tutorial visual tanpa mengubah data tugasmu.</p><button className="btn btn-secondary" type="button" onClick={onStartTutorial}><CircleHelp size={16} />Mulai tutorial lagi</button></article>
    <article className="card settings-card">
      <div className="card-header"><div><p className="section-kicker">Backup dan pemulihan</p><h2>Data tetap di perangkat ini</h2></div><span className="card-icon"><Download size={18} /></span></div>
      <p className="muted">Backup menyimpan tugas, mata kuliah, profil, XP, sesi fokus, dan preferensi dalam satu file JSON.</p>
      {backupReminder && <p className="muted">{backupReminder.text}</p>}
      <div className="action-row">
        <button className="btn btn-secondary" type="button" onClick={exportData}><Download size={16} />Export JSON</button>
        <button className="btn btn-secondary" type="button" onClick={() => fileRef.current?.click()}><Upload size={16} />Import JSON</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
      </div>
      {snapshot && (
        <>
          <p className="muted">TaskFlow menyimpan satu salinan otomatis tepat sebelum import atau reset. Salinan terakhir dibuat {formatSnapshotLabel(snapshot)} dan berisi {snapshot.data.tasks.length} tugas.</p>
          <div className="action-row"><button className="btn btn-secondary" type="button" onClick={restoreSnapshot}><History size={16} />Pulihkan snapshot otomatis</button></div>
        </>
      )}
      {persisted === false && (
        <>
          <p className="muted">Peramban boleh membersihkan penyimpanan situs saat ruang menipis. Menandai data sebagai persisten menurunkan risiko itu.</p>
          <div className="action-row"><button className="btn btn-secondary" type="button" onClick={enablePersistentStorage}><ShieldCheck size={16} />Lindungi data di perangkat ini</button></div>
        </>
      )}
      {persisted === true && <p className="muted"><ShieldCheck size={14} /> Data sudah ditandai persisten oleh peramban ini.</p>}
    </article>
    <article className="card danger-card"><div className="card-header"><div><p className="section-kicker danger-text">Perangkat bersama</p><h2>Mulai workspace baru</h2></div><span className="card-icon card-icon-danger"><Trash2 size={18} /></span></div><p className="muted">Hapus semua data lokal perangkat ini agar pengguna berikutnya dapat mengisi profil dan mengikuti tutorial dari awal.</p><button className="btn btn-danger" type="button" onClick={resetAll}><Trash2 size={16} />Mulai workspace baru</button></article>
  </div>
  <SettingsAside profile={data.profile} progress={data.progress} streak={streak} />
  <ConfirmDialog open={Boolean(confirm)} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.type === 'reset' ? 'Mulai baru' : confirm?.type === 'snapshot' ? 'Pulihkan snapshot' : 'Pulihkan data'} danger={confirm?.type === 'reset'} onClose={() => setConfirm(null)} onConfirm={confirmAction} />
  </section>;
}
