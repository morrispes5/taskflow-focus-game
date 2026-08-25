const STORAGE_KEY = 'taskflow_tasks';
const MAX_TASK_LENGTH = 120;
const MAX_CATEGORY_LENGTH = 32;
const PRIORITY_LABELS = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

let tasks = [];
let currentFilter = 'all';
let currentPriority = 'all';
let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'newest';
let editingTaskId = null;
let taskDialogReturnFocus = null;
let confirmAction = null;
let pendingImport = null;
let userProfile = { name: 'Vio', tagline: 'Ruang produktif harian' };

document.addEventListener('DOMContentLoaded', init);

function init() {
  loadTasksFromLocalStorage();
  loadProfileFromLocalStorage();
  setupEventListeners();
  render();
}

function loadTasksFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    resetToDemoTasks();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    tasks = Array.isArray(parsed) ? parsed.map(normalizeTask).filter(Boolean) : [];
    saveTasksToLocalStorage();
  } catch (error) {
    tasks = [];
  }
}

function normalizeTask(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text ?? '').trim();
  if (!text) return null;

  const fallbackTime = Date.now() + index;
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : fallbackTime;
  const updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : createdAt;
  const completed = Boolean(raw.completed);
  const completedAt = Number.isFinite(Number(raw.completedAt)) ? Number(raw.completedAt) : null;
  const dueDate = isValidDateString(raw.dueDate) ? raw.dueDate : null;
  const priority = Object.hasOwn(PRIORITY_LABELS, raw.priority) ? raw.priority : 'medium';
  const category = String(raw.category ?? '').trim().slice(0, MAX_CATEGORY_LENGTH) || null;

  return { id: Number.isFinite(Number(raw.id)) ? Number(raw.id) : fallbackTime, text: text.slice(0, MAX_TASK_LENGTH), completed, createdAt, updatedAt, completedAt: completed ? completedAt : null, dueDate, priority, category };
}

function saveTasksToLocalStorage() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

function resetToDemoTasks() {
  const today = getDateString(new Date());
  const tomorrow = getDateString(addDays(new Date(), 1));
  const yesterday = getDateString(addDays(new Date(), -1));
  const now = Date.now();
  tasks = [
    { id: 1, text: 'Pelajari struktur HTML & CSS', completed: true, createdAt: now - 172800000, updatedAt: now - 86400000, completedAt: now - 86400000, dueDate: yesterday, priority: 'medium', category: 'Kuliah' },
    { id: 2, text: 'Hubungkan script.js ke halaman index.html', completed: false, createdAt: now - 3600000, updatedAt: now - 3600000, completedAt: null, dueDate: today, priority: 'high', category: 'Proyek' },
    { id: 3, text: 'Buat wireframe halaman tugas', completed: false, createdAt: now - 1800000, updatedAt: now - 1800000, completedAt: null, dueDate: tomorrow, priority: 'medium', category: 'Desain' }
  ];
  saveTasksToLocalStorage();
}

function loadProfileFromLocalStorage() {
  const name = localStorage.getItem('taskflow_username');
  const tagline = localStorage.getItem('taskflow_tagline');
  if (name) userProfile.name = name;
  if (tagline) userProfile.tagline = tagline;
}

function saveProfileToLocalStorage(name, tagline) {
  userProfile.name = name;
  userProfile.tagline = tagline;
  localStorage.setItem('taskflow_username', name);
  localStorage.setItem('taskflow_tagline', tagline);
}

function render() {
  renderTasksPage();
  renderDashboardPage();
  renderAnalyticsPage();
  renderSettingsPage();
}

function renderTasksPage() {
  const taskList = document.getElementById('task-list');
  if (!taskList) return;
  const filteredTasks = getVisibleTasks();
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyMessage = document.getElementById('empty-message');
  const summary = document.getElementById('task-list-summary');

  taskList.innerHTML = filteredTasks.map(task => renderTaskItem(task)).join('');
  setText('active-count', tasks.filter(task => !task.completed).length);
  setText('filter-all-count', tasks.length);
  setText('filter-active-count', tasks.filter(task => !task.completed).length);
  setText('filter-completed-count', tasks.filter(task => task.completed).length);
  document.querySelectorAll('.filter-btn').forEach(button => button.classList.toggle('active', button.dataset.filter === currentFilter));
  populateCategoryFilter();
  if (summary) summary.textContent = getTaskListSummary(filteredTasks.length);

  if (emptyState) {
    emptyState.hidden = filteredTasks.length > 0;
    if (filteredTasks.length === 0 && emptyTitle && emptyMessage) {
      if (!tasks.length) { emptyTitle.textContent = 'Belum ada tugas'; emptyMessage.textContent = 'Tulis tugas pertama kamu di atas untuk mulai produktif.'; }
      else if (currentSearch || currentPriority !== 'all' || currentCategory !== 'all') { emptyTitle.textContent = 'Tidak ada hasil'; emptyMessage.textContent = 'Coba ubah kata kunci atau filter untuk menemukan tugas lain.'; }
      else if (currentFilter === 'active') { emptyTitle.textContent = 'Tidak ada tugas aktif'; emptyMessage.textContent = 'Semua tugasmu sudah selesai. Kerja bagus!'; }
      else if (currentFilter === 'completed') { emptyTitle.textContent = 'Belum ada tugas selesai'; emptyMessage.textContent = 'Tugas yang kamu selesaikan akan muncul di sini.'; }
    }
  }
}

function renderTaskItem(task, compact = false) {
  const due = getDueInfo(task);
  const category = task.category ? `<span class="category-badge">${escapeHTML(task.category)}</span>` : '';
  const priority = `<span class="priority-badge priority-${task.priority}">${PRIORITY_LABELS[task.priority]}</span>`;
  const dueClass = due.status ? ` ${due.status}` : '';
  const actions = compact ? '' : `<div class="task-actions"><button class="icon-btn edit-btn" type="button" data-id="${task.id}" title="Edit tugas" aria-label="Edit ${escapeHTML(task.text)}">✎</button><button class="icon-btn delete-btn" type="button" data-id="${task.id}" title="Hapus tugas" aria-label="Hapus ${escapeHTML(task.text)}">×</button></div>`;
  return `<li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}"><label class="task-check"><input type="checkbox" class="toggle-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''} aria-label="Tandai ${escapeHTML(task.text)} sebagai ${task.completed ? 'aktif' : 'selesai'}"></label><div class="task-details"><div class="task-title-row"><span class="task-text">${escapeHTML(task.text)}</span>${priority}</div><div class="task-meta">${category}<span class="task-due${dueClass}">${due.label}</span></div></div>${actions}</li>`;
}

function getVisibleTasks() {
  const query = currentSearch.trim().toLowerCase();
  return tasks.filter(task => {
    const matchesStatus = currentFilter === 'all' || (currentFilter === 'active' && !task.completed) || (currentFilter === 'completed' && task.completed);
    const matchesPriority = currentPriority === 'all' || task.priority === currentPriority;
    const matchesCategory = currentCategory === 'all' || (task.category || 'Tanpa kategori') === currentCategory;
    const matchesSearch = !query || `${task.text} ${task.category || ''}`.toLowerCase().includes(query);
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  }).sort(compareTasks);
}

function compareTasks(a, b) {
  if (currentSort === 'dueSoon') { const aDue = a.dueDate ? parseDateString(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER; const bDue = b.dueDate ? parseDateString(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER; return aDue - bDue || b.createdAt - a.createdAt; }
  if (currentSort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
  return b.createdAt - a.createdAt;
}

function getTaskListSummary(count) {
  if (!tasks.length) return '';
  const filterLabel = currentFilter === 'all' ? 'semua tugas' : currentFilter === 'active' ? 'tugas aktif' : 'tugas selesai';
  return `Menampilkan ${count} dari ${tasks.length} ${filterLabel}.`;
}

function populateCategoryFilter() {
  const select = document.getElementById('category-filter');
  if (!select) return;
  const categories = [...new Set(tasks.map(task => task.category || 'Tanpa kategori'))].sort((a, b) => a.localeCompare(b, 'id'));
  select.innerHTML = '<option value="all">Semua kategori</option>' + categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join('');
  select.value = categories.includes(currentCategory) ? currentCategory : 'all';
}

function renderDashboardPage() {
  const statTotal = document.getElementById('stat-total');
  if (!statTotal) return;
  const activeTasks = tasks.filter(task => !task.completed);
  const completed = tasks.filter(task => task.completed);
  const today = getDateString(new Date());
  const dueToday = activeTasks.filter(task => task.dueDate === today).length;
  const overdue = activeTasks.filter(isOverdue).length;
  const completedWeek = completed.filter(task => task.completedAt && isWithinCurrentWeek(task.completedAt)).length;
  const focusTasks = getFocusTasks();
  document.getElementById('dashboard-welcome').textContent = `Selamat datang kembali, ${userProfile.name}. ${userProfile.tagline || 'Lihat apa yang perlu kamu selesaikan hari ini.'}`;
  setText('stat-total', tasks.length); setText('stat-active', activeTasks.length); setText('stat-due-today', dueToday); setText('stat-overdue', overdue); setText('stat-completed-week', completedWeek); setText('metric-due-today', dueToday); setText('metric-overdue', overdue); setText('metric-completed-week', completedWeek); setText('metric-current-focus', focusTasks[0]?.text || 'Belum ada');
  const list = document.getElementById('dashboard-task-list');
  const empty = document.getElementById('dashboard-empty-state');
  if (list && empty) { list.innerHTML = focusTasks.slice(0, 5).map(task => renderTaskItem(task, true)).join(''); empty.hidden = focusTasks.length > 0; }
}

function getFocusTasks() {
  const today = getDateString(new Date());
  return tasks.filter(task => !task.completed).sort((a, b) => {
    const rank = task => isOverdue(task) ? 0 : task.dueDate === today ? 1 : task.dueDate ? 2 : task.priority === 'high' ? 3 : 4;
    const aRank = rank(a); const bRank = rank(b);
    if (aRank !== bRank) return aRank - bRank;
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
  });
}

function renderAnalyticsPage() {
  const rateElement = document.getElementById('analytics-rate');
  if (!rateElement) return;
  const completed = tasks.filter(task => task.completed);
  const active = tasks.filter(task => !task.completed);
  const overdue = active.filter(isOverdue);
  const withDeadline = tasks.filter(task => task.dueDate);
  const completedWithDeadline = completed.filter(task => task.dueDate && task.completedAt);
  const onTime = completedWithDeadline.filter(task => task.completedAt <= endOfDate(parseDateString(task.dueDate))).length;
  const rate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
  const onTimeRate = completedWithDeadline.length ? Math.round((onTime / completedWithDeadline.length) * 100) : 0;
  const completedWeek = completed.filter(task => task.completedAt && isWithinCurrentWeek(task.completedAt)).length;
  setText('analytics-rate', `${rate}%`); setText('analytics-completed', completed.length); setText('analytics-active', active.length); setText('analytics-overdue', overdue.length); setText('analytics-on-time', `${onTimeRate}%`); setText('analytics-created', tasks.length); setText('analytics-done-week', completedWeek); setText('analytics-with-deadline', withDeadline.length);
  const fill = document.getElementById('analytics-progress-fill'); const track = fill?.parentElement;
  if (fill) fill.style.width = `${rate}%`; if (track) track.setAttribute('aria-valuenow', String(rate));
  setText('analytics-progress-percent', `${rate}%`); setText('analytics-progress-text', tasks.length ? `${completed.length} dari ${tasks.length} tugas selesai. Setiap langkah kecil tetap berarti.` : 'Belum ada data tugas.'); setText('analytics-insight', getAnalyticsInsight({ active, overdue, onTimeRate, completedWeek }));
  renderMetricBars('category-metrics', getCategoryMetrics(), tasks.length); renderMetricBars('priority-metrics', getPriorityMetrics(), tasks.length);
  const categoryEmpty = document.getElementById('category-empty'); if (categoryEmpty) categoryEmpty.hidden = tasks.some(task => task.category);
  const emptyState = document.getElementById('analytics-empty-state'); if (emptyState) emptyState.hidden = tasks.length > 0;
}

function getCategoryMetrics() { const counts = new Map(); tasks.forEach(task => { const key = task.category || 'Tanpa kategori'; counts.set(key, (counts.get(key) || 0) + 1); }); return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })); }
function getPriorityMetrics() { return ['high', 'medium', 'low'].map(priority => ({ label: PRIORITY_LABELS[priority], count: tasks.filter(task => task.priority === priority).length })).filter(item => item.count > 0); }
function renderMetricBars(id, metrics, total) { const list = document.getElementById(id); if (!list) return; list.innerHTML = metrics.map(item => { const percentage = total ? Math.round((item.count / total) * 100) : 0; return `<li><span>${escapeHTML(item.label)}</span><div class="metric-bar-wrap"><div class="metric-bar" aria-hidden="true"><span style="width: ${percentage}%"></span></div><strong>${item.count}</strong></div></li>`; }).join(''); }
function getAnalyticsInsight({ active, overdue, onTimeRate, completedWeek }) { if (!tasks.length) return 'Tambahkan deadline agar progresmu bisa terbaca lebih jelas.'; if (overdue.length) return `Ada ${overdue.length} tugas terlambat yang bisa kamu prioritaskan lebih dulu.`; if (!active.length) return 'Semua tugas selesai. Nikmati progresmu dan siapkan langkah berikutnya.'; if (onTimeRate >= 80) return 'Kamu cukup konsisten menyelesaikan tugas tepat waktu. Pertahankan ritmenya.'; if (completedWeek) return `${completedWeek} tugas selesai minggu ini. Kamu sedang membangun momentum yang baik.`; return 'Pilih satu tugas terdekat dan mulai dari langkah yang paling kecil.'; }

function renderSettingsPage() { const usernameInput = document.getElementById('settings-username'); if (!usernameInput) return; usernameInput.value = userProfile.name; const taglineInput = document.getElementById('settings-tagline'); if (taglineInput) taglineInput.value = userProfile.tagline; }

function validateTaskData(data) { const text = String(data.text ?? '').trim(); const category = String(data.category ?? '').trim(); if (!text) return { field: 'text', message: 'Judul tugas wajib diisi.' }; if (text.length > MAX_TASK_LENGTH) return { field: 'text', message: `Judul tugas maksimal ${MAX_TASK_LENGTH} karakter.` }; if (category.length > MAX_CATEGORY_LENGTH) return { field: 'category', message: `Kategori maksimal ${MAX_CATEGORY_LENGTH} karakter.` }; if (data.dueDate && !isValidDateString(data.dueDate)) return { field: 'dueDate', message: 'Tanggal deadline tidak valid.' }; return null; }
function addTask(data) { const error = validateTaskData(data); if (error) return error; const now = Date.now(); tasks.unshift({ id: createTaskId(), text: data.text.trim(), completed: false, createdAt: now, updatedAt: now, completedAt: null, dueDate: data.dueDate || null, priority: data.priority || 'medium', category: data.category.trim() || null }); saveTasksToLocalStorage(); return null; }
function updateTask(id, data) { const error = validateTaskData(data); if (error) return error; tasks = tasks.map(task => task.id === id ? { ...task, text: data.text.trim(), dueDate: data.dueDate || null, priority: data.priority || 'medium', category: data.category.trim() || null, updatedAt: Date.now() } : task); saveTasksToLocalStorage(); return null; }
function toggleTaskStatus(id) { const now = Date.now(); tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed, completedAt: !task.completed ? now : null, updatedAt: now } : task); saveTasksToLocalStorage(); render(); }
function deleteTask(id) { tasks = tasks.filter(task => task.id !== id); saveTasksToLocalStorage(); render(); }

function exportTasks() { const dataStr = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(tasks, null, 2))}`; const anchor = document.createElement('a'); anchor.href = dataStr; anchor.download = 'taskflow-backup.json'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); }

async function importTasks(file) {
  if (!file) return;
  try { const parsed = JSON.parse(await file.text()); const source = Array.isArray(parsed) ? parsed : parsed?.tasks; if (!Array.isArray(source)) throw new Error('Format JSON tidak sesuai.'); const normalized = source.map(normalizeTask).filter(Boolean); if (source.length && !normalized.length) throw new Error('Tidak ada tugas valid di file tersebut.'); pendingImport = normalized; openConfirmDialog({ title: 'Ganti data tugas?', message: `Backup ini berisi ${normalized.length} tugas dan akan menggantikan data saat ini.`, confirmLabel: 'Import data', action: () => { tasks = pendingImport; pendingImport = null; saveTasksToLocalStorage(); render(); showDataStatus('Data berhasil dipulihkan.', false); } }); } catch (error) { showDataStatus(error.message || 'File JSON tidak bisa dibaca.', true); }
}

function setupEventListeners() {
  const taskList = document.getElementById('task-list'); const quickForm = document.getElementById('quick-add-form'); const quickInput = document.getElementById('task-input'); const taskDialog = document.getElementById('task-dialog'); const taskDialogForm = document.getElementById('task-dialog-form'); const taskSearch = document.getElementById('task-search'); const priorityFilter = document.getElementById('priority-filter'); const categoryFilter = document.getElementById('category-filter'); const taskSort = document.getElementById('task-sort');
  if (quickForm && quickInput) quickForm.addEventListener('submit', event => { event.preventDefault(); const error = addTask({ text: quickInput.value, priority: 'medium', category: '', dueDate: '' }); setInputError(quickInput, document.getElementById('task-input-error'), error?.message || ''); if (!error) { quickInput.value = ''; quickInput.focus(); render(); } });
  document.getElementById('open-task-dialog-btn')?.addEventListener('click', event => openTaskDialog(null, event.currentTarget)); document.getElementById('empty-add-btn')?.addEventListener('click', event => openTaskDialog(null, event.currentTarget)); document.getElementById('dashboard-add-task-btn')?.addEventListener('click', event => openTaskDialog(null, event.currentTarget)); document.getElementById('dashboard-empty-add-btn')?.addEventListener('click', event => openTaskDialog(null, event.currentTarget));
  taskList?.addEventListener('change', event => { if (event.target.classList.contains('toggle-checkbox')) toggleTaskStatus(Number(event.target.dataset.id)); });
  taskList?.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; const id = Number(button.dataset.id); if (button.classList.contains('edit-btn')) openTaskDialog(id, button); if (button.classList.contains('delete-btn')) openConfirmDialog({ title: 'Hapus tugas ini?', message: 'Tugas yang dihapus tidak bisa dipulihkan.', confirmLabel: 'Hapus tugas', action: () => deleteTask(id) }, button); });
  document.getElementById('dashboard-task-list')?.addEventListener('change', event => { if (event.target.classList.contains('toggle-checkbox')) toggleTaskStatus(Number(event.target.dataset.id)); });
  document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; render(); }));
  taskSearch?.addEventListener('input', event => { currentSearch = event.target.value; render(); }); priorityFilter?.addEventListener('change', event => { currentPriority = event.target.value; render(); }); categoryFilter?.addEventListener('change', event => { currentCategory = event.target.value; render(); }); taskSort?.addEventListener('change', event => { currentSort = event.target.value; render(); });
  if (taskDialog && taskDialogForm) { taskDialogForm.addEventListener('submit', event => { event.preventDefault(); const data = getTaskDialogData(); const error = editingTaskId ? updateTask(editingTaskId, data) : addTask(data); if (error) { showTaskDialogError(error); return; } closeTaskDialog(); render(); }); document.getElementById('task-dialog-cancel')?.addEventListener('click', closeTaskDialog); document.getElementById('task-dialog-close')?.addEventListener('click', closeTaskDialog); taskDialog.addEventListener('close', () => { editingTaskId = null; restoreDialogFocus(); }); document.getElementById('task-dialog-text')?.addEventListener('input', () => clearTaskDialogError('text')); document.getElementById('task-dialog-category')?.addEventListener('input', () => clearTaskDialogError('category')); }
  setupConfirmDialog(); setupSettingsListeners();
}

function setupSettingsListeners() {
  const profileForm = document.getElementById('profile-form');
  profileForm?.addEventListener('submit', event => { event.preventDefault(); const name = document.getElementById('settings-username').value.trim() || 'Pengguna'; const tagline = document.getElementById('settings-tagline')?.value.trim() || ''; saveProfileToLocalStorage(name, tagline); const status = document.getElementById('profile-save-status'); if (status) { status.hidden = false; setTimeout(() => { status.hidden = true; }, 2500); } render(); });
  document.getElementById('export-tasks-btn')?.addEventListener('click', () => { exportTasks(); showDataStatus('Backup berhasil dibuat.', false); }); document.getElementById('import-tasks-btn')?.addEventListener('click', () => document.getElementById('import-tasks-input')?.click()); document.getElementById('import-tasks-input')?.addEventListener('change', event => importTasks(event.target.files?.[0]));
  document.getElementById('clear-tasks-btn')?.addEventListener('click', event => openConfirmDialog({ title: 'Hapus semua tugas?', message: 'Semua tugas di perangkat ini akan dihapus dan tidak bisa dipulihkan.', confirmLabel: 'Hapus semua', action: () => { tasks = []; saveTasksToLocalStorage(); render(); showDataStatus('Semua tugas sudah dihapus.', false); } }, event.currentTarget)); document.getElementById('reset-demo-btn')?.addEventListener('click', event => openConfirmDialog({ title: 'Gunakan data demo?', message: 'Data tugas saat ini akan diganti dengan beberapa tugas contoh.', confirmLabel: 'Gunakan demo', action: () => { resetToDemoTasks(); render(); showDataStatus('Data demo berhasil dimuat.', false); } }, event.currentTarget));
}

function setupConfirmDialog() { const dialog = document.getElementById('confirm-dialog'); if (!dialog) return; document.getElementById('confirm-form')?.addEventListener('submit', event => { event.preventDefault(); const action = confirmAction; closeConfirmDialog(); action?.(); }); document.getElementById('confirm-cancel')?.addEventListener('click', closeConfirmDialog); document.getElementById('confirm-dialog-close')?.addEventListener('click', closeConfirmDialog); dialog.addEventListener('close', () => { confirmAction = null; restoreDialogFocus(); }); }
function openTaskDialog(taskId = null, trigger = null) { const dialog = document.getElementById('task-dialog'); if (!dialog) return; editingTaskId = taskId; taskDialogReturnFocus = trigger; const task = tasks.find(item => item.id === taskId); setText('task-dialog-title', task ? 'Edit tugas' : 'Tambah tugas'); document.getElementById('task-dialog-text').value = task?.text || ''; document.getElementById('task-dialog-due-date').value = task?.dueDate || ''; document.getElementById('task-dialog-priority').value = task?.priority || 'medium'; document.getElementById('task-dialog-category').value = task?.category || ''; clearTaskDialogError('text'); clearTaskDialogError('category'); if (!dialog.open) dialog.showModal(); requestAnimationFrame(() => document.getElementById('task-dialog-text')?.focus()); }
function closeTaskDialog() { const dialog = document.getElementById('task-dialog'); if (dialog?.open) dialog.close(); else { editingTaskId = null; restoreDialogFocus(); } }
function getTaskDialogData() { return { text: document.getElementById('task-dialog-text').value, dueDate: document.getElementById('task-dialog-due-date').value, priority: document.getElementById('task-dialog-priority').value, category: document.getElementById('task-dialog-category').value }; }
function showTaskDialogError(error) { const fieldId = error.field === 'dueDate' ? 'due-date' : error.field; const input = document.getElementById(`task-dialog-${fieldId}`); const errorElement = document.getElementById(`task-dialog-${fieldId}-error`); if (input) input.setAttribute('aria-invalid', 'true'); if (errorElement) errorElement.textContent = error.message; input?.focus(); }
function clearTaskDialogError(field) { const input = document.getElementById(`task-dialog-${field}`); const errorElement = document.getElementById(`task-dialog-${field}-error`); input?.setAttribute('aria-invalid', 'false'); if (errorElement) errorElement.textContent = ''; }
function openConfirmDialog({ title, message, confirmLabel, action }, trigger = null) { const dialog = document.getElementById('confirm-dialog'); if (!dialog) { if (window.confirm(message)) action?.(); return; } confirmAction = action; taskDialogReturnFocus = trigger; setText('confirm-dialog-title', title); setText('confirm-dialog-message', message); setText('confirm-submit', confirmLabel); if (!dialog.open) dialog.showModal(); requestAnimationFrame(() => document.getElementById('confirm-cancel')?.focus()); }
function closeConfirmDialog() { const dialog = document.getElementById('confirm-dialog'); if (dialog?.open) dialog.close(); else { confirmAction = null; restoreDialogFocus(); } }
function restoreDialogFocus() { const target = taskDialogReturnFocus; taskDialogReturnFocus = null; if (target && document.contains(target)) requestAnimationFrame(() => target.focus()); }
function showDataStatus(message, isError) { const status = document.getElementById('data-status'); if (!status) return; status.textContent = message; status.className = `form-status${isError ? ' form-status-error' : ''}`; }
function setInputError(input, errorElement, message) { if (!input || !errorElement) return; input.setAttribute('aria-invalid', String(Boolean(message))); errorElement.textContent = message; }
function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
function createTaskId() { let id = Date.now(); while (tasks.some(task => task.id === id)) id += 1; return id; }
function escapeHTML(value) { const div = document.createElement('div'); div.textContent = String(value ?? ''); return div.innerHTML; }
function getDateString(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function parseDateString(value) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); }
function isValidDateString(value) { if (!value || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = parseDateString(value); return getDateString(date) === value; }
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function endOfDate(date) { const result = new Date(date); result.setHours(23, 59, 59, 999); return result.getTime(); }
function isWithinCurrentWeek(timestamp) { const date = new Date(timestamp); const start = new Date(); const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); start.setHours(0, 0, 0, 0); return date.getTime() >= start.getTime() && date.getTime() <= Date.now(); }
function isOverdue(task) { return !task.completed && task.dueDate && task.dueDate < getDateString(new Date()); }
function getDueInfo(task) { if (!task.dueDate) return { label: 'Tanpa deadline', status: '' }; const today = getDateString(new Date()); const tomorrow = getDateString(addDays(new Date(), 1)); if (!task.completed && task.dueDate < today) return { label: `Terlambat · ${formatDate(task.dueDate)}`, status: 'overdue' }; if (task.dueDate === today) return { label: task.completed ? 'Deadline hari ini' : 'Hari ini', status: 'today' }; if (task.dueDate === tomorrow) return { label: 'Besok', status: '' }; return { label: formatDate(task.dueDate), status: '' }; }
function formatDate(value) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(parseDateString(value)); }
