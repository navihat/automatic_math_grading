export default function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', marginBottom: 16 }}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none',
            borderBottom: active === id ? '2px solid var(--accent-light)' : '2px solid transparent',
            background: 'none', color: active === id ? 'var(--accent-light)' : 'var(--text-secondary)',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
