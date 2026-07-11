import { useState, useEffect } from 'react';
import './App.css';

import DashboardPage from './pages/DashboardPage';
import ClassesPage from './pages/ClassesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import GradingPage from './pages/GradingPage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Tổng quan' },
  { id: 'classes', icon: '🏫', label: 'Lớp học' },
  { id: 'assignments', icon: '📝', label: 'Bài tập & Rubric' },
  { id: 'grading', icon: '🤖', label: 'Chấm điểm AI' },
  { id: 'results', icon: '📋', label: 'Kết quả & Review' },
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
            <div className="logo-icon">🧮</div>
            <div>
              <h1>Math Grading</h1>
              <div className="subtitle">AI Powered</div>
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
          <div className="user-info" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="user-avatar">
                {currentUser.name.split(' ').pop().slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="user-name">{currentUser.name}</div>
                <div className="user-role">{currentUser.username}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="page-header">
          <h2>{meta.title}</h2>
          <p>{meta.desc}</p>
        </div>
        <div className="page-body">
          {page === 'dashboard' && <DashboardPage teacherId={teacherId} />}
          {page === 'classes' && <ClassesPage teacherId={teacherId} />}
          {page === 'assignments' && <AssignmentsPage teacherId={teacherId} />}
          {page === 'grading' && <GradingPage teacherId={teacherId} />}
          {page === 'results' && <ResultsPage teacherId={teacherId} />}
        </div>
      </main>
    </div>
  );
}
