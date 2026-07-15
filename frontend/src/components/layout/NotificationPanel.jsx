import { useState, useRef, useEffect } from 'react';
import { NOTIF_ICONS, relativeTime } from '../../hooks/useNotifications';

export default function NotificationPanel({ notifications, unreadCount, onMarkAllRead, onClearAll }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle() {
    const next = !show;
    setShow(next);
    if (next) onMarkAllRead?.();
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="header-icon-btn" title="Thông báo" onClick={toggle}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--danger)', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {show && (
        <div style={{ position: 'absolute', top: '110%', right: 0, width: 300, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Thông báo</span>
            {notifications.length > 0 && (
              <button onClick={onClearAll} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Xóa tất cả</button>
            )}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Chưa có thông báo.</div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--accent-bg)' }}>
                <span style={{ fontSize: 18, lineHeight: 1.4 }}>{NOTIF_ICONS[n.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{relativeTime(n.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
