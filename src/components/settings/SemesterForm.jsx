export function SemesterForm({ semester, onChange, onSubmit }) {
  const setField = (field) => (event) => onChange((current) => ({ ...current, [field]: event.target.value }));
  return (
    <article className="card settings-card">
      <div className="card-header"><div><p className="section-kicker">Semester</p><h2>Bingkai waktu opsional</h2></div></div>
      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field-group">
          <label htmlFor="semester-name">Nama semester</label>
          <input id="semester-name" className="input" value={semester.name || ''} onChange={setField('name')} placeholder="Ganjil 2026" />
        </div>
        <div className="form-grid-two">
          <div className="field-group">
            <label htmlFor="semester-start">Mulai</label>
            <input id="semester-start" className="input" type="date" value={semester.startDate || ''} onChange={setField('startDate')} />
          </div>
          <div className="field-group">
            <label htmlFor="semester-end">Selesai</label>
            <input id="semester-end" className="input" type="date" value={semester.endDate || ''} onChange={setField('endDate')} />
          </div>
        </div>
        <p className="muted">Tanggal ini dipakai Analitik untuk memfilter tugas dan sesi fokus semester berjalan.</p>
        <button className="btn btn-secondary" type="submit">Simpan semester</button>
      </form>
    </article>
  );
}
