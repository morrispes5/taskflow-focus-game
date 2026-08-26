import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { MoreHorizontal, Search, Zap } from 'lucide-react';
import { filterTasks, makeTask, sortTasks, validateTaskInput } from '../lib/domain.js';
import { TASK_TYPE_LABELS, TASK_TYPES } from '../lib/storage.js';
import { ConfirmDialog, EmptyState } from '../components/ui.jsx';
import { TaskRow } from '../components/TaskRow.jsx';
import { TaskDialog } from '../components/TaskDialog.jsx';

export function TasksPage({ data, commit, toggleTask }) {
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [courseId, setCourseId] = useState('all');
  const [type, setType] = useState('all');
  const [archived, setArchived] = useState('active');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [dialogTask, setDialogTask] = useState(null);
  const [confirmTask, setConfirmTask] = useState(null);
  const [quickText, setQuickText] = useState('');
  const [quickError, setQuickError] = useState('');
  const quickInputRef = useRef(null);
  useEffect(() => {
    const focusQuickAdd = (event) => {
      const tagName = event.target?.tagName;
      if (event.key.toLowerCase() !== 'n' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return;
      event.preventDefault();
      quickInputRef.current?.focus();
    };
    window.addEventListener('keydown', focusQuickAdd);
    return () => window.removeEventListener('keydown', focusQuickAdd);
  }, []);
  const categories = [...new Set(data.tasks.map((task) => task.category || 'Tanpa kategori'))].sort((a, b) => a.localeCompare(b, 'id'));
  const visible = sortTasks(filterTasks(data.tasks, { status, priority, category, search, courseId, type, archived }), sort);
  const saveTask = (input, id) => commit((current) => id ? ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...input, text: input.text.trim(), dueDate: input.dueDate || null, dueTime: input.dueTime || null, category: input.category?.trim() || null, estimateMinutes: Number(input.estimateMinutes) || 25, courseId: input.courseId || null, updatedAt: Date.now() } : task) }) : ({ ...current, tasks: [makeTask(input), ...current.tasks] }), id ? 'Tugas diperbarui.' : 'Tugas ditambahkan.');
  const addQuick = (event) => { event.preventDefault(); const validation = validateTaskInput({ text: quickText }); if (validation) { setQuickError(validation.message); return; } saveTask({ text: quickText, priority: 'medium', category: '', dueDate: '', type: 'tugas', courseId: courseId !== 'all' && courseId !== 'none' ? Number(courseId) : null }); setQuickText(''); setQuickError(''); };
  const pinTask = (task) => commit((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, pinned: !item.pinned, updatedAt: Date.now() } : item) }), task.pinned ? 'Sematan dilepas.' : 'Tugas disematkan.');
  const archiveTask = (task) => commit((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, archived: !item.archived, updatedAt: Date.now() } : item) }), task.archived ? 'Tugas dikeluarkan dari arsip.' : 'Tugas diarsipkan.');
  const duplicateTask = (task) => commit((current) => ({ ...current, tasks: [makeTask({ ...task, text: `${task.text} (salinan)`, pinned: false }), ...current.tasks] }), 'Salinan tugas dibuat.');
  return <>
    <section className="task-capture card"><div className="capture-title"><div><p className="section-kicker">Tangkap cepat</p><h2>Apa yang ingin kamu selesaikan?</h2></div><span className="shortcut-hint">Tekan N untuk mulai, Enter untuk tambah</span></div><form className="quick-add-form" onSubmit={addQuick}><label className="sr-only" htmlFor="quick-task">Judul tugas baru</label><input ref={quickInputRef} id="quick-task" className="input input-large" value={quickText} onChange={(event) => { setQuickText(event.target.value); setQuickError(''); }} placeholder="Contoh: Selesaikan outline presentasi" maxLength={120} aria-invalid={Boolean(quickError)} /><button className="btn btn-primary" type="submit"><Zap size={16} />Tambah cepat</button><button className="btn btn-secondary" type="button" onClick={() => setDialogTask({})}><MoreHorizontal size={17} />Tambah detail</button></form>{quickError && <p className="form-error" role="alert">{quickError}</p>}</section>
    <section className="toolbar-section"><div className="filter-tabs" role="group" aria-label="Filter status tugas">{[['all', 'Semua'], ['active', 'Aktif'], ['completed', 'Selesai']].map(([key, label]) => <button key={key} className={`chip ${status === key ? 'active' : ''}`} type="button" onClick={() => setStatus(key)}>{label}<span>{key === 'all' ? data.tasks.filter((task) => !task.archived).length : key === 'active' ? data.tasks.filter((task) => !task.completed && !task.archived).length : data.tasks.filter((task) => task.completed && !task.archived).length}</span></button>)}</div><span className="counter-badge"><strong>{data.tasks.filter((task) => !task.completed && !task.archived).length}</strong> aktif</span></section>
    <section className="task-filter-grid">
      <label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Cari tugas</span><input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari tugas atau catatan..." /></label>
      <label><span className="sr-only">Filter mata kuliah</span><select className="input" value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="all">Semua mata kuliah</option><option value="none">Tanpa mata kuliah</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
      <label><span className="sr-only">Filter jenis</span><select className="input" value={type} onChange={(event) => setType(event.target.value)}><option value="all">Semua jenis</option>{TASK_TYPES.map((key) => <option key={key} value={key}>{TASK_TYPE_LABELS[key]}</option>)}</select></label>
      <label><span className="sr-only">Filter prioritas</span><select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">Semua prioritas</option><option value="high">Prioritas tinggi</option><option value="medium">Prioritas sedang</option><option value="low">Prioritas rendah</option></select></label>
      <label><span className="sr-only">Filter kategori</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Semua kategori</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label><span className="sr-only">Arsip</span><select className="input" value={archived} onChange={(event) => setArchived(event.target.value)}><option value="active">Sembunyikan arsip</option><option value="archived">Hanya arsip</option><option value="all">Termasuk arsip</option></select></label>
      <label><span className="sr-only">Urutkan tugas</span><select className="input" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Terbaru</option><option value="dueSoon">Deadline terdekat</option><option value="priority">Prioritas tertinggi</option></select></label>
    </section>
    <section className="task-results card"><div className="list-summary" role="status" aria-live="polite">Menampilkan {visible.length} dari {data.tasks.length} tugas</div>{visible.length ? <ul className="task-list task-list-room"><AnimatePresence mode="popLayout">{visible.map((task) => <TaskRow key={task.id} task={task} courses={data.courses} onToggle={toggleTask} onEdit={setDialogTask} onDelete={setConfirmTask} onPin={pinTask} onArchive={archiveTask} onDuplicate={duplicateTask} />)}</AnimatePresence></ul> : <EmptyState title={!data.tasks.length ? 'Belum ada tugas' : 'Tidak ada hasil'} message={!data.tasks.length ? 'Tulis misi pertamamu di bagian atas untuk mulai membangun momentum.' : 'Coba ubah kata kunci atau filter agar daftar lain terlihat.'} action="Tambah tugas" onAction={() => setDialogTask({})} />}</section>
    <TaskDialog open={dialogTask !== null} task={dialogTask?.id ? dialogTask : null} courses={data.courses} semester={data.semester} onClose={() => setDialogTask(null)} onSave={saveTask} />
    <ConfirmDialog open={Boolean(confirmTask)} title="Hapus tugas ini?" message="Tugas yang dihapus tidak bisa dipulihkan dari TaskFlow." confirmLabel="Hapus tugas" danger onClose={() => setConfirmTask(null)} onConfirm={() => commit((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== confirmTask?.id) }), 'Tugas dihapus.')} />
  </>;
}
