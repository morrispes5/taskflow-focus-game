import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { loadAppData, saveAppData, resetAppData, loadWorkspaceSnapshot, WorkspaceConflictError } from './lib/storage.js';
import { applyTaskSave, applyTaskToggle, resolveTheme } from './lib/domain.js';
import { getDueReminders, markRemindersNotified, sendNotification } from './lib/reminders.js';
import { playFeedbackTone } from './lib/audio.js';
import { AppShell } from './components/AppShell.jsx';
import { WorkspaceLoading } from './components/ui.jsx';

function getCurrentPage() { return document.body.dataset.page || 'home'; }

// TaskFlow adalah multi-page: satu dokumen hanya pernah merender satu halaman.
// Mengimpor keenam halaman secara statis membuat setiap HTML mengunduh kode
// halaman yang tidak akan pernah dipakainya.
const PAGE_MODULES = {
  home: () => import('./pages/HomePage.jsx').then((module) => ({ default: module.HomePage })),
  tasks: () => import('./pages/TasksPage.jsx').then((module) => ({ default: module.TasksPage })),
  calendar: () => import('./pages/CalendarPage.jsx').then((module) => ({ default: module.CalendarPage })),
  focus: () => import('./pages/FocusPage.jsx').then((module) => ({ default: module.FocusPage })),
  analytics: () => import('./pages/AnalyticsPage.jsx').then((module) => ({ default: module.AnalyticsPage })),
  settings: () => import('./pages/SettingsPage.jsx').then((module) => ({ default: module.SettingsPage }))
};

// Unduhan dimulai saat modul dievaluasi, bukan saat render, supaya berjalan
// paralel dengan hidrasi IndexedDB dan tidak menambah waktu tunggu.
// Dialog tugas hanya diunduh saat tangkap cepat benar-benar dibuka, supaya
// pintasan global ini tidak menambah beban chunk utama setiap halaman.
const QuickCaptureDialog = lazy(() => import('./components/TaskDialog.jsx').then((module) => ({ default: module.TaskDialog })));

const ACTIVE_PAGE = getCurrentPage();
const activePageModule = (PAGE_MODULES[ACTIVE_PAGE] || PAGE_MODULES.home)();
const ActivePage = lazy(() => activePageModule);

export default function TaskFlowApp() {
  const page = ACTIVE_PAGE;
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [recoverySnapshot, setRecoverySnapshot] = useState(null);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const dataRef = useRef(data);
  const revisionRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());
  const workspaceChannelRef = useRef(null);

  const hydrate = useCallback(async () => {
    try {
      setStorageError(null);
      const snapshot = await loadAppData();
      revisionRef.current = snapshot.revision;
      dataRef.current = snapshot.data;
      setData(snapshot.data);
      setTourOpen(snapshot.data.onboarding.profileCompleted && !snapshot.data.onboarding.tutorialCompleted && !snapshot.data.onboarding.tutorialSkipped);
      return snapshot;
    } catch (error) {
      setStorageError(error.message || 'Data TaskFlow tidak dapat dibuka di browser ini.');
    }
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  const commit = useCallback((updater, message = '', feedback = null) => {
    if (!dataRef.current) return Promise.resolve(null);
    const operation = saveQueueRef.current.catch(() => undefined).then(async () => {
      const base = { data: dataRef.current, revision: revisionRef.current };
      const next = updater(base.data);
      let saved;
      try {
        saved = await saveAppData(next, base.revision);
      } catch (error) {
        if (!(error instanceof WorkspaceConflictError)) throw error;
        const latest = await loadAppData();
        revisionRef.current = latest.revision;
        dataRef.current = latest.data;
        setData(latest.data);
        throw new WorkspaceConflictError();
      }
      revisionRef.current = saved.revision;
      dataRef.current = saved.data;
      setData(saved.data);
      setStorageError(null);
      window.dispatchEvent(new CustomEvent('taskflow:data-changed'));
      workspaceChannelRef.current?.postMessage({ type: 'workspace-updated', revision: saved.revision });
      if (message) setNotice({ id: Date.now(), text: message });
      if (feedback && saved.data.preferences.sound) playFeedbackTone(feedback, saved.data.preferences.focusSoundVolume);
      return saved;
    });
    saveQueueRef.current = operation.catch((error) => {
      setStorageError(error.message || 'Perubahan belum dapat disimpan.');
    });
    return operation;
  }, []);

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return undefined;
    const channel = new BroadcastChannel('taskflow-workspace');
    workspaceChannelRef.current = channel;
    channel.onmessage = (event) => {
      const incomingRevision = Number(event.data?.revision);
      if (event.data === 'updated' || !Number.isSafeInteger(incomingRevision) || incomingRevision > revisionRef.current) hydrate();
    };
    return () => { workspaceChannelRef.current = null; channel.close(); };
  }, [hydrate]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Reset mengembalikan pengguna ke gerbang profil, tempat Pengaturan tidak
  // terjangkau. Tanpa jalan pulih di sini, snapshot jadi tidak berguna justru
  // pada skenario yang paling membutuhkannya.
  const profileCompleted = data?.onboarding.profileCompleted;
  useEffect(() => {
    if (profileCompleted !== false) { setRecoverySnapshot(null); return; }
    loadWorkspaceSnapshot().then(setRecoverySnapshot).catch(() => setRecoverySnapshot(null));
  }, [profileCompleted]);

  // Sengaja tidak mengambil snapshot lebih dulu: workspace saat ini kosong dan
  // menyimpannya justru akan menimpa satu-satunya titik pulih yang ada.
  const restoreRecoverySnapshot = () => {
    if (!recoverySnapshot) return undefined;
    return commit(() => recoverySnapshot.data, 'Snapshot dipulihkan.');
  };

  // Ide bisa datang di halaman mana pun, termasuk saat Focus Run berjalan.
  // Ctrl+K menangkapnya tanpa harus pindah halaman lebih dulu.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key?.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      event.preventDefault();
      setQuickCaptureOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const saveQuickCapture = (input) => commit((current) => applyTaskSave(current, input), 'Tugas ditambahkan.', 'taskAdded');

  const theme = data ? resolveTheme(data.preferences.theme, systemDark) : 'light';

  useEffect(() => {
    if (!data) return;
    document.documentElement.dataset.motion = data.preferences.motion;
    document.documentElement.dataset.page = page;
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#121820' : page === 'focus' ? '#17202f' : '#f7f8f5');
  }, [data?.preferences.motion, page, theme]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const reminders = useMemo(() => data ? getDueReminders(data.tasks, data.progress) : [], [data]);

  useEffect(() => {
    if (!data?.preferences.notify) return undefined;
    const fresh = reminders.filter((item) => !item.alreadyNotified);
    if (!fresh.length) return undefined;
    const timeout = window.setTimeout(() => {
      fresh.slice(0, 3).forEach((item) => sendNotification(item.overdue ? 'Tugas terlambat' : 'Deadline hari ini', item.task.text));
      commit((current) => ({ ...current, progress: markRemindersNotified(current.progress, fresh.map((item) => item.key)) }));
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [data?.preferences.notify, reminders, commit]);

  const toggleTask = useCallback((taskId) => {
    if (!dataRef.current) return;
    const wasCompleted = dataRef.current.tasks.find((task) => task.id === taskId)?.completed;
    const { message } = applyTaskToggle(dataRef.current, taskId);
    commit((current) => applyTaskToggle(current, taskId).data, message, wasCompleted ? null : 'complete');
  }, [commit]);

  const updatePreferences = (preferences) => commit((current) => ({ ...current, preferences: { ...current.preferences, ...preferences } }));

  const completeProfile = (input) => {
    const completedAt = Date.now();
    commit((current) => ({
      ...current,
      profile: { ...current.profile, name: input.name.trim(), role: input.role, goal: input.goal.trim() },
      onboarding: { ...current.onboarding, profileCompleted: true, tutorialCompleted: false, tutorialSkipped: false, completedAt }
    }), 'Profil tersimpan.');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setTourOpen(true);
  };

  const closeTutorial = (result = 'skip') => {
    setTourOpen(false);
    commit((current) => ({
      ...current,
      onboarding: {
        ...current.onboarding,
        tutorialCompleted: result === 'complete' ? true : current.onboarding.tutorialCompleted,
        tutorialSkipped: result === 'skip' ? true : current.onboarding.tutorialSkipped
      }
    }));
  };

  const resetWorkspace = async () => {
    const operation = saveQueueRef.current.catch(() => undefined).then(async () => {
      let reset;
      try {
        reset = await resetAppData(revisionRef.current);
      } catch (error) {
        if (!(error instanceof WorkspaceConflictError)) throw error;
        const latest = await loadAppData();
        reset = await resetAppData(latest.revision);
      }
      revisionRef.current = reset.revision;
      dataRef.current = reset.data;
      setData(reset.data);
      setStorageError(null);
      setTourOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.dispatchEvent(new CustomEvent('taskflow:data-changed'));
      workspaceChannelRef.current?.postMessage({ type: 'workspace-reset', revision: reset.revision });
      return reset;
    });
    saveQueueRef.current = operation.catch(() => undefined);
    try {
      return await operation;
    } catch (error) {
      setStorageError(error.message || 'Workspace belum dapat direset.');
      throw error;
    }
  };

  if (!data) return <WorkspaceLoading error={storageError} onRetry={hydrate} />;

  return (
    <MotionConfig reducedMotion={data.preferences.motion === 'compact' ? 'always' : 'user'}>
      <AppShell page={page} profile={data.profile} progress={data.progress} onboarding={data.onboarding} notice={notice} tourOpen={tourOpen} reminders={reminders} onCompleteProfile={completeProfile} recoverySnapshot={recoverySnapshot} onRestoreSnapshot={restoreRecoverySnapshot} onCloseTutorial={closeTutorial} onOpenReminders={() => { window.location.href = 'calendar.html'; }}>
        {/* Setiap halaman hanya memakai prop yang relevan baginya; sisanya diabaikan. */}
        <Suspense fallback={null}>
          <ActivePage data={data} commit={commit} toggleTask={toggleTask} updatePreferences={updatePreferences} onStartTutorial={() => setTourOpen(true)} onResetWorkspace={resetWorkspace} />
        </Suspense>
        <Suspense fallback={null}>
          {quickCaptureOpen && (
            <QuickCaptureDialog
              open={quickCaptureOpen}
              task={null}
              courses={data.courses}
              semester={data.semester}
              role={data.profile.role}
              onClose={() => setQuickCaptureOpen(false)}
              onSave={saveQuickCapture}
            />
          )}
        </Suspense>
      </AppShell>
    </MotionConfig>
  );
}
