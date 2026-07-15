function MilestoneRow({ m, i, onUpdate, onRemove }) {
  return (
    <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: 13, minWidth: 28, paddingTop: 7 }}>{m.id}</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input className="form-input" style={{ marginBottom: 0, fontSize: 13 }}
          placeholder="Tên milestone (ngắn gọn)"
          value={m.name} onChange={e => onUpdate(i, 'name', e.target.value)} required />
        <input className="form-input" style={{ marginBottom: 0, fontSize: 12 }}
          placeholder="Mô tả chi tiết (tuỳ chọn)"
          value={m.description} onChange={e => onUpdate(i, 'description', e.target.value)} />
      </div>
      <button type="button" onClick={() => onRemove(i)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: '4px 2px', marginTop: 2 }}>✕</button>
    </div>
  );
}

export default function MilestoneEditor({ milestones, onUpdate, onRemove, onAdd }) {
  function getGroups() {
    const groups = [];
    const seen = new Set();
    for (const m of milestones) {
      const g = m.question_group || null;
      if (!seen.has(g)) { seen.add(g); groups.push(g); }
    }
    return groups;
  }

  if (milestones.length === 0) return null;

  const groups = getGroups();
  const isGrouped = groups.some(g => g !== null);

  if (!isGrouped) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {milestones.map((m, i) => <MilestoneRow key={i} m={m} i={i} onUpdate={onUpdate} onRemove={onRemove} />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(group => (
        <div key={group ?? '__ungrouped'}>
          {group && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: 1 }}>
                📌 {group}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => onAdd(group)}>
                + Thêm vào {group}
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: group ? 8 : 0, borderLeft: group ? '2px solid var(--accent-bg)' : 'none' }}>
            {milestones.map((m, i) => m.question_group === group ? <MilestoneRow key={i} m={m} i={i} onUpdate={onUpdate} onRemove={onRemove} /> : null)}
          </div>
        </div>
      ))}
    </div>
  );
}
