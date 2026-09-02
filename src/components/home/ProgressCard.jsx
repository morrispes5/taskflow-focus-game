import { motion } from 'motion/react';
import { Flame, Snowflake, Trophy, Zap } from 'lucide-react';
import { getNextLevelXp, getStreakFreezesRemaining, todayString } from '../../lib/domain.js';
import { ProgressMeter } from '../ui.jsx';

export function ProgressCard({ progress }) {
  const levelProgress = progress.totalXp % 100;
  return (
    <motion.aside className="progress-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.06 }}>
      <div className="card-topline">
        <span className="section-kicker">Perjalanan level</span>
        <span className="level-label"><Zap size={14} />Lv {progress.level}</span>
      </div>
      <div className="level-number">{progress.totalXp}<small>/ {getNextLevelXp(progress.totalXp)} XP</small></div>
      <ProgressMeter value={levelProgress} label="Menuju level berikutnya" />
      <div className="progress-foot">
        <span><Trophy size={15} />{progress.milestones.length} milestone</span>
        <span><Flame size={15} />{progress.bestStreak} best streak</span>
        <span title="Sisa streak freeze bulan ini"><Snowflake size={15} />{getStreakFreezesRemaining(progress, todayString())} freeze tersisa</span>
      </div>
    </motion.aside>
  );
}
