import { useState, useEffect, useRef } from 'react';
import './App.css';

import DashboardPage from './pages/DashboardPage';
import ClassesPage from './pages/ClassesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import GradingPage from './pages/GradingPage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import { useNotifications, NOTIF_ICONS, relativeTime } from './hooks/useNotifications';

const NAV_ITEMS = [
  { id: 'dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>, label: 'Tổng quan' },
  { id: 'classes', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: 'Lớp học' },
  { id: 'assignments', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, label: 'Bài tập & Rubric' },
  { id: 'grading', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="3"/><line x1="15" y1="1" x2="15" y2="3"/><line x1="9" y1="21" x2="9" y2="23"/><line x1="15" y1="21" x2="15" y2="23"/><line x1="21" y1="9" x2="23" y2="9"/><line x1="21" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="1" y1="15" x2="3" y2="15"/></svg>, label: 'Chấm điểm AI' },
  { id: 'results', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>, label: 'Kết quả & Review' },
];

const PAGE_META = {
  dashboard: { title: 'Tổng quan', desc: 'Thống kê tổng hợp hệ thống chấm điểm' },
  classes: { title: 'Quản lý Lớp học', desc: 'Thêm, sửa, xoá lớp học và danh sách học sinh' },
  assignments: { title: 'Bài tập & Rubric', desc: 'Quản lý bài tập và tiêu chí chấm điểm' },
  grading: { title: 'Chấm điểm AI lớp học', desc: 'Xem danh sách nộp bài, chấm điểm AI từng học sinh hoặc cả lớp' },
  results: { title: 'Kết quả & Review', desc: 'Xem kết quả chấm và đánh giá lại điểm số' },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const notifRef = useRef(null);
  const msgRef = useRef(null);
  const { notifications, addNotification, markAllRead, clearAll, unreadCount } = useNotifications();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (msgRef.current && !msgRef.current.contains(e.target)) setShowMsg(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem('user');
  }

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg"></div>
        <p>Đang tải cấu hình...</p>
      </div>
    );
  }

  // 1. If not logged in, show login page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. If student logged in, show student dashboard
  if (currentUser.role === 'student') {
    return <StudentDashboard student={currentUser} onLogout={handleLogout} />;
  }

  // 3. Otherwise show teacher dashboard layout
  const meta = PAGE_META[page];
  const teacherId = currentUser.user_id ?? currentUser.id;

  return (
    <div className="app-layout">
      {/* Mobile Menu Toggle */}
      <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon" style={{ background: 'none', boxShadow: 'none' }}>
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 5L15 25V60C15 76.5 50 95 50 95C50 95 85 76.5 85 60V25L50 5Z" fill="url(#sidebarCrest)" stroke="#ffffff" strokeWidth="4"/>
                <path d="M50 25V75M25 50H75" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"/>
                <circle cx="50" cy="50" r="10" fill="#ffb03a" />
                <defs>
                  <linearGradient id="sidebarCrest" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0c647b"/>
                    <stop offset="1" stopColor="#051b3d"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1>Math Grading</h1>
              <div className="subtitle">AI Powered</div>
            </div>
          </div>

          {/* User Profile Card right below logo */}
          <div className="sidebar-user-card" style={{ marginTop: 20 }}>
            <div className="sidebar-user-avatar fallback">
              {currentUser.name.split(' ').pop().slice(0, 2).toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">Hi, {currentUser.name.split(' ').pop()}</div>
              <div className="sidebar-user-code">{currentUser.username}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleLogout} 
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              background: 'transparent', 
              borderColor: 'var(--sidebar-border)', 
              color: 'var(--sidebar-text-muted)' 
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-title">
            <h2>{meta.title}</h2>
            <p>{meta.desc}</p>
          </div>
          <div className="page-header-actions">
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button className="header-icon-btn" title="Thông báo" onClick={() => { setShowNotif(v => !v); setShowMsg(false); if (!showNotif) markAllRead(); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--danger)', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotif && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 300, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Thông báo</span>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Xóa tất cả</button>
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
            <div style={{ position: 'relative' }} ref={msgRef}>
              <button className="header-icon-btn" title="Tin nhắn" onClick={() => { setShowMsg(v => !v); setShowNotif(false); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
              {showMsg && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 260, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 16, zIndex: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Tin nhắn</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Chưa có tin nhắn mới.</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="page-body">
          {page === 'dashboard' && <DashboardPage teacherId={teacherId} />}
          {page === 'classes' && <ClassesPage teacherId={teacherId} />}
          {page === 'assignments' && <AssignmentsPage teacherId={teacherId} onNotify={addNotification} />}
          {page === 'grading' && <GradingPage teacherId={teacherId} onNotify={addNotification} />}
          {page === 'results' && <ResultsPage teacherId={teacherId} />}
        </div>
      </main>
    </div>
  );
}
