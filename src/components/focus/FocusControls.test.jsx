import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusControls } from './FocusControls.jsx';
import { FocusTimer } from './FocusTimer.jsx';

const emptyStatus = {
  isReady: false, isFocusing: false, isDistracted: false, isPaused: false,
  isBreak: false, isRecapOnly: false, isReview: false, isReviewReady: false, isReviewSession: false
};

const allControls = { canPause: true, canMarkDistraction: true, canFinish: true, canResume: true, canAbandon: true };

function renderControls(overrides, actions = {}) {
  render(<FocusControls
    status={{ ...emptyStatus, ...overrides }}
    controls={allControls}
    taskFocusMinutes={50}
    sessionXp={4}
    reduced
    actions={{ startFocus: () => {}, pauseFocus: () => {}, resumeFocus: () => {}, markDistraction: () => {}, resumeFromDistraction: () => {}, finishFocus: () => {}, requestTaskCompletion: () => {}, abandonFocus: () => {}, clearBreak: () => {}, ...actions }}
  />);
}

const buttonLabels = () => [...document.querySelectorAll('.focus-controls button')].map((button) => button.textContent.trim());

describe('FocusControls', () => {
  it('menawarkan tombol mulai saat sesi belum berjalan', () => {
    renderControls({ isReady: true });
    expect(buttonLabels()).toEqual(['Mulai 50 menit', 'Mulai 50 menit']);
  });

  it('beralih ke kontrol sesi berjalan saat sedang fokus', () => {
    renderControls({ isFocusing: true });
    expect(buttonLabels()).toEqual(['Jeda sesi', 'Tandai distraksi', 'Selesaikan tugas']);
  });

  it('memakai istilah review ketika sesi berjalan dalam mode review', () => {
    renderControls({ isFocusing: true, isReviewSession: true });
    expect(buttonLabels()).toEqual(['Jeda review', 'Tandai distraksi', 'Selesaikan review']);
  });

  it('menawarkan kembali fokus saat distraksi ditandai', () => {
    renderControls({ isDistracted: true });
    expect(buttonLabels()).toEqual(['Kembali fokus', 'Akhiri tanpa menyelesaikan tugas']);
  });

  it('menawarkan lanjutkan saat sesi dijeda', () => {
    renderControls({ isPaused: true });
    expect(buttonLabels()).toEqual(['Lanjutkan', 'Akhiri tanpa menyelesaikan tugas']);
  });

  it('menawarkan simpan recap beserta XP sesi saat istirahat', () => {
    renderControls({ isBreak: true });
    expect(buttonLabels()).toEqual(['Simpan recap']);
    expect(screen.getByText('Sesi memberi +4 XP')).toBeInTheDocument();
  });

  it('tidak menjanjikan XP untuk sesi review', () => {
    renderControls({ isBreak: true, isReviewSession: true });
    expect(screen.getByText('Review tidak menambah XP')).toBeInTheDocument();
  });

  it('menghormati ketersediaan kontrol dari domain', () => {
    render(<FocusControls
      status={{ ...emptyStatus, isFocusing: true }}
      controls={{ ...allControls, canPause: false, canFinish: false }}
      taskFocusMinutes={25}
      sessionXp={0}
      reduced
      actions={{}}
    />);
    const [pause, , finish] = [...document.querySelectorAll('.focus-controls button')];
    expect(pause.disabled).toBe(true);
    expect(finish.disabled).toBe(true);
  });

  it('meneruskan durasi tugas ke aksi mulai', () => {
    const startFocus = vi.fn();
    renderControls({ isReady: true }, { startFocus });
    [...document.querySelectorAll('.focus-controls button')][0].click();
    expect(startFocus).toHaveBeenCalledWith(50);
  });
});

const timer = (overrides = {}) => ({ activeSeconds: 0, plannedMinutes: 50, plannedSeconds: 3000, remainingSeconds: 3000, overtimeSeconds: 0, isOvertime: false, ...overrides });

function renderTimer(statusOverrides, timerOverrides = {}, breakRemainingSeconds = 0) {
  render(<FocusTimer status={{ ...emptyStatus, ...statusOverrides }} timer={timer(timerOverrides)} breakRemainingSeconds={breakRemainingSeconds} completion={0} reduced />);
}

const timerText = () => ({
  status: document.querySelector('.timer-status')?.textContent,
  value: document.querySelector('.focus-timer strong')?.textContent,
  subtitle: document.querySelector('.timer-subtitle')?.textContent
});

describe('FocusTimer', () => {
  it('menampilkan durasi rencana sebelum sesi dimulai', () => {
    renderTimer({ isReady: true });
    expect(timerText()).toMatchObject({ status: 'Siap dimulai', value: '50:00', subtitle: '50 menit sesi fokus' });
  });

  it('menghitung mundur sisa waktu saat fokus berjalan', () => {
    renderTimer({ isFocusing: true }, { activeSeconds: 120, remainingSeconds: 2880 });
    expect(timerText()).toMatchObject({ status: 'Fokus sekarang', value: '48:00' });
  });

  it('menampilkan waktu tambahan setelah target tercapai', () => {
    renderTimer({ isFocusing: true }, { remainingSeconds: 0, overtimeSeconds: 65, isOvertime: true });
    expect(timerText()).toMatchObject({ status: 'Waktu tambahan', value: '+01:05' });
  });

  it('membedakan jeda dari distraksi', () => {
    renderTimer({ isPaused: true });
    expect(timerText().status).toBe('Dijeda');
    render(<div />);
  });

  it('menampilkan sisa istirahat, dan durasi aktif ketika hanya recap', () => {
    renderTimer({ isBreak: true }, {}, 300);
    expect(timerText()).toMatchObject({ status: 'Waktu istirahat', value: '05:00' });
  });

  it('memakai durasi aktif ketika istirahat sudah lewat dan tinggal recap', () => {
    renderTimer({ isBreak: true, isRecapOnly: true }, { activeSeconds: 1500 });
    expect(timerText()).toMatchObject({ status: 'Sesi selesai', value: '25:00' });
  });
});
