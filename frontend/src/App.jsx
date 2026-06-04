import { useState } from 'react';
import './App.css';

import DashboardPage from './pages/DashboardPage';
import ClassesPage from './pages/ClassesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import GradingPage from './pages/GradingPage';
import ResultsPage from './pages/ResultsPage';

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
  grading: { title: 'Chấm điểm bằng AI', desc: 'Upload bài làm viết tay để AI chấm điểm tự động' },
  results: { title: 'Kết quả & Review', desc: 'Xem kết quả chấm và đánh giá lại điểm số' },
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const meta = PAGE_META[page];

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
          <div className="user-info">
            <div className="user-avatar">GV</div>
            <div>
              <div className="user-name">Giáo viên Demo</div>
              <div className="user-role">teacher@demo.com</div>
            </div>
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
          {page === 'dashboard' && <DashboardPage />}
          {page === 'classes' && <ClassesPage />}
          {page === 'assignments' && <AssignmentsPage />}
          {page === 'grading' && <GradingPage />}
          {page === 'results' && <ResultsPage />}
        </div>
      </main>
    </div>
  );
}
