import { useState, useEffect } from 'react';
import { api } from '../api';

export default function DashboardPage({ teacherId }) {
  const [stats, setStats] = useState({ classes: 0, students: 0, assignments: 0, submissions: 0 });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [teacherId]);

  async function loadDashboard() {
    try {
      const [classes, assignments] = await Promise.all([
        api.getClasses(teacherId),
        api.getAssignments(teacherId),
      ]);

      // Count all students across all classes
      let totalStudents = 0;
      for (const cls of classes) {
        try {
          const students = await api.getStudents(cls.id);
          totalStudents += students.length;
        } catch { /* skip */ }
      }

      setStats({
        classes: classes.length,
        students: totalStudents,
        assignments: assignments.length,
        submissions: 0,
      });

      setRecentAssignments(assignments.slice(-5).reverse());
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner spinner-lg"></div>
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div className="stats-grid">
        <div className="stat-card" style={{ animationDelay: '0.05s' }}>
          <div className="stat-icon violet">🏫</div>
          <div>
            <div className="stat-value">{stats.classes}</div>
            <div className="stat-label">Lớp học</div>
          </div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.1s' }}>
          <div className="stat-icon green">👨‍🎓</div>
          <div>
            <div className="stat-value">{stats.students}</div>
            <div className="stat-label">Học sinh</div>
          </div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.15s' }}>
          <div className="stat-icon blue">📝</div>
          <div>
            <div className="stat-value">{stats.assignments}</div>
            <div className="stat-label">Bài tập</div>
          </div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.2s' }}>
          <div className="stat-icon amber">🤖</div>
          <div>
            <div className="stat-value">{stats.submissions}</div>
            <div className="stat-label">Bài đã chấm</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">📋 Bài tập gần đây</span>
        </div>
        {recentAssignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>Chưa có bài tập</h3>
            <p>Tạo bài tập đầu tiên trong phần "Bài tập"</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Đề bài</th>
                <th>Loại</th>
                <th>Hạn nộp</th>
              </tr>
            </thead>
            <tbody>
              {recentAssignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.problem_text.length > 60 ? a.problem_text.slice(0, 60) + '...' : a.problem_text}</td>
                  <td><span className="badge badge-violet">{a.type}</span></td>
                  <td>{new Date(a.deadline).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
