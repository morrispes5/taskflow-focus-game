import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { loadAppData, saveAppData, resetAppData } from './lib/storage.js';
import { applyTaskToggle, resolveTheme } from './lib/domain.js';
import { getDueReminders, markRemindersNotified, sendNotification } from './lib/reminders.js';
import { AppShell } from './components/AppShell.jsx';
import { WorkspaceLoading } from './components/ui.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { TasksPage } from './pages/TasksPage.jsx';
import { FocusPage } from './pages/FocusPage.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

function getCurrentPage() { return document.body.dataset.page || 'home'; }

export default function TaskFlowApp() {
  const page = getCurrentPage();
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const dataRef = useRef(data);
  const saveQueueRef = useRef(Promise.resolve());
  const workspaceChannelRef = useRef(null);

  const hydrate = useCallback(async () => {
    try {
      setStorageError(null);
      const initial = await loadAppData();
      dataRef.current = initial;
      setData(initial);
      setTourOpen(initial.onboarding.profileCompleted && !initial.onboarding.tutorialCompleted && !initial.onboarding.tutorialSkipped);
    } catch (error) {
      setStorageError(error.message || 'Data TaskFlow tidak dapat dibuka di browser ini.');
    }
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  const commit = useCallback((updater, message = '') => {
    if (!dataRef.current) return;
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(() => saveAppData(next));
    saveQueueRef.current.then(() => {
      window.dispatchEvent(new CustomEvent('taskflow:data-changed'));
      workspaceChannelRef.current?.postMessage('updated');
    }).catch((error) => setStorageError(error.message || 'Perubahan belum dapat disimpan.'));
    if (message) setNotice({ id: Date.now(), text: message });
  }, []);

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return undefined;
    const channel = new BroadcastChannel('taskflow-workspace');
    workspaceChannelRef.current = channel;
    channel.onmessage = () => hydrate();
    return () => { workspaceChannelRef.current = null; channel.close(); };
  }, [hydrate]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

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
    const { data: next, message } = applyTaskToggle(dataRef.current, taskId);
    commit(() => next, message);
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
    try {
      const next = await resetAppData();
      dataRef.current = next;
      setData(next);
      setTourOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.dispatchEvent(new CustomEvent('taskflow:data-changed'));
      workspaceChannelRef.current?.postMessage('updated');
    } catch (error) {
      setStorageError(error.message || 'Workspace belum dapat direset.');
      throw error;
    }
  };

  if (!data) return <WorkspaceLoading error={storageError} onRetry={hydrate} />;

  return (
    <MotionConfig reducedMotion={data.preferences.motion === 'compact' ? 'always' : 'user'}>
      <AppShell page={page} profile={data.profile} progress={data.progress} onboarding={data.onboarding} notice={notice} tourOpen={tourOpen} reminders={reminders} onCompleteProfile={completeProfile} onCloseTutorial={closeTutorial} onOpenReminders={() => { window.location.href = 'calendar.html'; }}>
        {page === 'home' && <HomePage data={data} commit={commit} toggleTask={toggleTask} />}
        {page === 'tasks' && <TasksPage data={data} commit={commit} toggleTask={toggleTask} />}
        {page === 'calendar' && <CalendarPage data={data} />}
        {page === 'focus' && <FocusPage data={data} commit={commit} toggleTask={toggleTask} />}
        {page === 'analytics' && <AnalyticsPage data={data} />}
        {page === 'settings' && <SettingsPage data={data} commit={commit} updatePreferences={updatePreferences} onStartTutorial={() => setTourOpen(true)} onResetWorkspace={resetWorkspace} />}
      </AppShell>
    </MotionConfig>
  );
}
