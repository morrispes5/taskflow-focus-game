import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ListChecks, Sparkles } from 'lucide-react';
import { getProfileRecommendations, makeTask } from '../../lib/domain.js';

export function RecommendationPanel({ data, commit, onCreateTask }) {
  const recommendationSource = useMemo(
    () => getProfileRecommendations(data.profile).filter((item) => !data.tasks.some((task) => task.text.toLowerCase() === item.text.toLowerCase())),
    [data.profile, data.tasks]
  );
  const recommendationKey = recommendationSource.map((item) => item.id).join('|');
  const [drafts, setDrafts] = useState(recommendationSource);
  const [selectedIds, setSelectedIds] = useState(recommendationSource.map((item) => item.id));
  const [status, setStatus] = useState('');

  useEffect(() => {
    setDrafts(recommendationSource);
    setSelectedIds(recommendationSource.map((item) => item.id));
    // Sengaja hanya bergantung pada kunci daftarnya: recommendationSource adalah
    // array baru setiap render dan akan membuat efek ini berjalan tanpa henti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendationKey]);

  if (!recommendationSource.length) return null;

  const toggle = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateDraft = (id, text) => setDrafts((current) => current.map((item) => item.id === id ? { ...item, text } : item));

  const addSelected = () => {
    const selected = drafts.filter((item) => selectedIds.includes(item.id) && item.text.trim());
    if (!selected.length) {
      setStatus('Pilih setidaknya satu langkah yang ingin ditambahkan.');
      return;
    }
    const stamp = Date.now();
    const created = selected.map((item, index) => makeTask({ text: item.text.trim(), priority: 'medium', category: item.category, estimateMinutes: 25, type: item.type || 'tugas' }, stamp + index));
    commit((current) => ({ ...current, tasks: [...created, ...current.tasks] }), `${selected.length} rekomendasi ditambahkan.`);
    setStatus('Langkah pilihanmu sudah masuk ke Tugas.');
  };

  return (
    <section className="recommendation-panel card" data-tour="recommendations">
      <div className="recommendation-header">
        <div>
          <p className="section-kicker">Dari tujuanmu</p>
          <h2>Mulai dengan langkah yang terasa masuk akal.</h2>
          <p className="muted">Saran ini dibuat lokal dari tujuan “{data.profile.goal}”. Edit atau pilih yang paling cocok.</p>
        </div>
        <span className="card-icon"><Sparkles size={18} /></span>
      </div>
      <div className="recommendation-list">
        {drafts.map((item) => (
          <label className="recommendation-item" key={item.id}>
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} />
            <span className="recommendation-check" aria-hidden="true"><Check size={13} /></span>
            <input className="input" value={item.text} onChange={(event) => updateDraft(item.id, event.target.value)} aria-label={`Edit rekomendasi: ${item.text}`} />
            <span className="category-badge">{item.category}</span>
          </label>
        ))}
      </div>
      <div className="recommendation-footer">
        <button className="text-link" type="button" onClick={onCreateTask}>Buat tugas sendiri <ArrowRight size={15} /></button>
        <div className="recommendation-actions">
          <span className="form-status" role="status">{status}</span>
          <button className="btn btn-primary" type="button" onClick={addSelected}><ListChecks size={16} />Tambahkan pilihan</button>
        </div>
      </div>
    </section>
  );
}
