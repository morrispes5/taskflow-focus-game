import { Check, Sparkles } from 'lucide-react';
import { PROFILE_ROLES, PROFILE_ROLE_LABELS } from '../../lib/storage.js';

export function ProfileForm({ profile, status, onChange, onSubmit }) {
  const setField = (field) => (event) => onChange((current) => ({ ...current, [field]: event.target.value }));
  return (
    <article className="card settings-card">
      <div className="card-header">
        <div><p className="section-kicker">Profil</p><h2>Ruang kerja yang terasa milikmu</h2></div>
        <span className="card-icon"><Sparkles size={18} /></span>
      </div>
      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field-group">
          <label htmlFor="profile-name">Nama panggilan</label>
          <input id="profile-name" className="input" maxLength={40} value={profile.name} onChange={setField('name')} />
        </div>
        <div className="field-group">
          <label htmlFor="profile-role">Peran</label>
          <select id="profile-role" className="input" value={profile.role} onChange={setField('role')}>
            <option value="">Pilih peran</option>
            {PROFILE_ROLES.map((role) => <option key={role} value={role}>{PROFILE_ROLE_LABELS[role]}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="profile-goal">Tujuan utama</label>
          <textarea id="profile-goal" className="input" maxLength={120} value={profile.goal} onChange={setField('goal')} placeholder="Contoh: Menyelesaikan proyek akhir dengan lebih teratur" />
        </div>
        <div className="field-group">
          <label htmlFor="profile-tagline">Tagline <span className="label-hint">opsional</span></label>
          <input id="profile-tagline" className="input" maxLength={80} value={profile.tagline} onChange={setField('tagline')} placeholder="Pelan-pelan tapi selesai" />
        </div>
        <div className="action-row">
          <button className="btn btn-primary" type="submit"><Check size={16} />Simpan profil</button>
          {status.text && <span className={status.error ? 'form-status form-status-error' : 'form-status'} role="status">{status.text}</span>}
        </div>
      </form>
    </article>
  );
}
