import { CircleHelp } from 'lucide-react';

export function SettingsAside({ profile, progress, streak }) {
  return (
    <aside className="settings-aside">
      <div className="settings-profile">
        <span className="profile-orbit"><span>{(profile.name || 'V').slice(0, 1).toUpperCase()}</span></span>
        <p className="eyebrow">Level {progress.level}</p>
        <h2>{profile.name || 'Pengguna baru'}</h2>
        <p>{profile.goal || profile.tagline}</p>
        <div className="aside-stats">
          <span><strong>{progress.totalXp}</strong> XP</span>
          <span title={streak.broken ? `Streak putus. Terbaik ${streak.bestStreak} hari.` : undefined}><strong>{streak.value}</strong> hari streak</span>
        </div>
      </div>
      <div className="help-note">
        <CircleHelp size={18} />
        <div>
          <strong>Ruang yang tenang</strong>
          <p>TaskFlow menyimpan data di browser perangkat ini dan tidak membutuhkan akun.</p>
        </div>
      </div>
    </aside>
  );
}
