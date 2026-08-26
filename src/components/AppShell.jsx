import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Flame, Menu, X, Zap } from 'lucide-react';
import { MOBILE_NAV_ITEMS, NAV_ITEMS, PAGE_META } from '../nav.js';
import { OnboardingTour, ProfileGate } from './Onboarding.jsx';
import { ReminderBanner } from './ui.jsx';

export function AppShell({ page, profile, progress, onboarding, notice, tourOpen, reminders = [], onCompleteProfile, onCloseTutorial, onOpenReminders, children }) {
  const meta = PAGE_META[page] || PAGE_META.home;
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`app-frame app-frame-${page}`}>
      <header className="app-header">
        <nav className={`navbar container ${menuOpen ? 'menu-open' : ''}`} aria-label="Navigasi utama">
          <a className="brand" href="index.html" aria-label="TaskFlow Beranda" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span className="brand-copy"><strong>TaskFlow</strong><small>Focus, then flow.</small></span>
          </a>
          <div className="nav-links">
            {NAV_ITEMS.map(({ href, page: itemPage, label, Icon }) => (
              <a key={itemPage} data-tour={itemPage} className={`nav-link ${page === itemPage ? 'active' : ''}`} href={href} aria-current={page === itemPage ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                <Icon size={16} strokeWidth={2.2} aria-hidden="true" /><span>{label}</span>
              </a>
            ))}
          </div>
          <div className="header-progress" title={`${progress.totalXp} XP`}>
            <span className="header-level"><Zap size={14} aria-hidden="true" /> Lv {progress.level}</span>
            <span className="header-streak"><Flame size={14} aria-hidden="true" /> {progress.currentStreak}</span>
          </div>
          <button className="icon-button menu-button" type="button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} title={menuOpen ? 'Tutup menu' : 'Buka menu'} onClick={() => setMenuOpen((current) => !current)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </nav>
      </header>
      <main className="container page-shell">
        {!onboarding.profileCompleted ? <ProfileGate profile={profile} onComplete={onCompleteProfile} /> : <>
        {page !== 'focus' && page !== 'home' && (
          <motion.section className="page-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
            <div>
              <p className="eyebrow">{meta.eyebrow}</p>
              <h1>{meta.title}</h1>
              <p className="page-description">{meta.description}</p>
            </div>
          </motion.section>
        )}
        {page !== 'focus' && <ReminderBanner items={reminders} onOpen={onOpenReminders} />}
        {children}
        </>}
      </main>
      <nav className="bottom-nav" aria-label="Navigasi cepat">
        {MOBILE_NAV_ITEMS.map(({ href, page: itemPage, label, Icon }) => (
          <a key={itemPage} className={page === itemPage ? 'active' : ''} href={href}><Icon size={18} /><span>{label}</span></a>
        ))}
        <a className={page === 'settings' || page === 'analytics' ? 'active' : ''} href="settings.html"><Zap size={18} /><span>Lainnya</span></a>
      </nav>
      <AnimatePresence>{notice && <motion.div className="toast" role="status" aria-live="polite" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}><Check size={15} />{notice.text}</motion.div>}</AnimatePresence>
      {onboarding.profileCompleted && tourOpen && <OnboardingTour onComplete={() => onCloseTutorial('complete')} onSkip={() => onCloseTutorial('skip')} />}
    </div>
  );
}
