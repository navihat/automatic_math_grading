import { useState } from 'react';
import { api } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [role, setRole] = useState('teacher'); // 'teacher' or 'student'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.login(username.trim(), password);
      // data contains: { id, name, username, role, token, class_id }
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container animate-fade">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🧮</div>
          <h2>Math Grading AI</h2>
          <p>Hệ thống chấm điểm toán tự động</p>
        </div>

        <div className="role-selector">
          <button
            type="button"
            className={`role-btn ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => { setRole('teacher'); setUsername(''); setPassword(''); setError(''); }}
          >
            🏫 Giáo viên
          </button>
          <button
            type="button"
            className={`role-btn ${role === 'student' ? 'active' : ''}`}
            onClick={() => { setRole('student'); setUsername(''); setPassword(''); setError(''); }}
          >
            🎓 Học sinh
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error-alert">⚠️ {error}</div>}

          <div className="form-group">
            <label className="form-label">
              {role === 'teacher' ? 'Email giáo viên' : 'Mã số học sinh (Student Code)'}
            </label>
            <input
              type="text"
              className="form-input-text"
              placeholder={role === 'teacher' ? 'teacher@demo.com' : 'Ví dụ: SV001'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-input-text"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            {role === 'student' && !username && (
              <span className="form-help-text">
                * Mật khẩu mặc định ban đầu là mã học sinh của bạn.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={loading}
            style={{ width: '100%', marginTop: 24, padding: '12px' }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 14, height: 14, marginRight: 8 }}></div> Đang xác thực...</>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
