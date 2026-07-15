import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';
import { useNotifications, NOTIF_TYPES, NOTIF_ICONS, relativeTime } from '../hooks/useNotifications';

export default function StudentDashboard({ student, onLogout }) {
  const { notifications, addNotification, markAllRead, clearAll, unreadCount } = useNotifications();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [rubrics, setRubrics] = useState({});
  const [activeTab, setActiveTab] = useState('assignments');

  const [previews, setPreviews] = useState([]); // [{id, url, file}]
  const [uploading, setUploading] = useState(false);
  const dragIdx = useRef(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const notifRef = useRef(null);
  const msgRef = useRef(null);

  useEffect(() => { loadData(); }, [student.class_id, student.id]);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (msgRef.current && !msgRef.current.contains(e.target)) setShowMsg(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadData() {
    try {
      const [asmList, subList] = await Promise.all([
        api.getAssignmentsByClass(student.class_id),
        api.getSubmissionsByStudent(student.id),
      ]);
      setAssignments(asmList);
      setSubmissions(subList);

      const rubricMap = {};
      await Promise.all(
        asmList.map(async (asm) => {
          try {
            const r = await api.getRubricsByAssignment(asm.id);
            if (r?.length > 0) rubricMap[asm.id] = r[0];
          } catch { /* ignore */ }
        })
      );
      setRubrics(rubricMap);

      if (asmList.length > 0 && !selectedAssignment) {
        setSelectedAssignment(asmList[0]);
      }
    } catch (err) {
      showToast('Không thể tải dữ liệu: ' + err.message, 'error');
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleFilesChange(e) {
    const incoming = Array.from(e.target.files || []);
    setPreviews(prev => {
      const remaining = 5 - prev.length;
      if (remaining <= 0) { showToast('Đã đạt giới hạn 5 ảnh.', 'error'); return prev; }
      const toAdd = incoming.slice(0, remaining);
      const newItems = toAdd.map(f => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), file: f }));
      return [...prev, ...newItems];
    });
    e.target.value = '';
    setAnalysisResult(null);
  }

  function removePreview(id) {
    setPreviews(prev => prev.filter(p => p.id !== id));
  }

  function handleDragStart(idx) { dragIdx.current = idx; }

  function handleDrop(e, idx) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    setPreviews(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    dragIdx.current = null;
  }

  async function handleUploadSubmit() {
    const rubric = rubrics[selectedAssignment.id];
    if (!rubric) { showToast('Bài tập này chưa có rubric chấm điểm!', 'error'); return; }
    if (previews.length === 0) { showToast('Vui lòng chọn ít nhất 1 ảnh bài làm.', 'error'); return; }

    setUploading(true);
    setAnalysisResult(null);
    try {
      const fd = new FormData();
      previews.forEach(p => fd.append('files', p.file));
      fd.append('student_id', student.id);
      fd.append('rubric_id', rubric.id);

      const res = await api.analyzeSubmission(fd);
      setAnalysisResult(res);
      showToast('Nộp bài và phân tích AI thành công!');
      addNotification(NOTIF_TYPES.SUBMISSION, 'Đã nộp bài thành công', selectedAssignment?.problem_text?.slice(0, 60) ?? 'Bài làm đã được ghi nhận');
      setPreviews([]);
      loadData();
    } catch (err) {
      showToast(err.message || 'Nộp bài thất bại', 'error');
    } finally {
      setUploading(false);
    }
  }

  function getLatestSubmission(assignmentId) {
    const rubric = rubrics[assignmentId];
    if (!rubric) return null;
    const filtered = submissions.filter(sub => sub.rubric_id === rubric.id);
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
  }

  const isExpired = (deadlineStr) => new Date(deadlineStr) < new Date();

  function MultiImageUpload({ previews, uploading, onFilesChange, onRemove, onDragStart, onDrop }) {
    return (
      <div>
        {previews.length < 5 && (
          <label style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
            <input type="file" accept="image/*" multiple onChange={onFilesChange} disabled={uploading} style={{ display: 'none' }} />
            <div className="file-upload" style={{ pointerEvents: uploading ? 'none' : 'auto' }}>
              <div className="file-upload-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-teal)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <div className="file-upload-text">
                Nhấp để chọn ảnh bài làm <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({previews.length}/5 ảnh)</span>
              </div>
            </div>
          </label>
        )}

        {previews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 10 }}>
            {previews.map((p, idx) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, idx)}
                style={{ position: 'relative', border: '2px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'grab', background: 'var(--bg-base)' }}
              >
                <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--accent-light)', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '1px 5px', zIndex: 1 }}>
                  {idx + 1}
                </div>
                <button
                  onClick={() => onRemove(p.id)}
                  disabled={uploading}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, lineHeight: 1 }}
                >
                  ✕
                </button>
                <img src={p.url} alt={`Trang ${idx + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '3px 0', background: 'var(--bg-elevated)' }}>
                  Kéo để sắp xếp
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function MilestoneResult({ result }) {
    if (!result) return null;
    const milestones = result.milestone_json || [];
    const achieved = milestones.filter(m => m.achieved).length;
    const feedback = result.feedback_text;
    const score = result.total_score;
    const needsReview = result.needs_review;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '12px 20px', background: 'var(--accent-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{score ?? '–'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Điểm AI</div>
          </div>
          <div style={{ padding: '12px 20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{achieved}/{milestones.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Milestone đạt</div>
          </div>
          {needsReview && (
            <span style={{ padding: '6px 12px', background: 'rgba(251,191,36,.15)', border: '1px solid #d97706', borderRadius: 'var(--radius)', fontSize: 12, color: '#d97706', fontWeight: 600 }}>
              Đang chờ giáo viên review
            </span>
          )}
        </div>

        {milestones.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Milestone</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 6, background: m.achieved ? 'rgba(16,185,129,.08)' : 'var(--bg-elevated)', border: `1px solid ${m.achieved ? 'rgba(16,185,129,.3)' : 'var(--border)'}` }}>
                  <span style={{ fontSize: 16 }}>{m.achieved ? '✅' : '⬜'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name || m.id}</div>
                    {m.comment && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{m.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {feedback && (
          <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Phản hồi AI</div>
            {feedback}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-layout">
      {toast && createPortal(
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
        document.body
      )}

      <aside className="sidebar open">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon" style={{ background: 'none', boxShadow: 'none' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                {/* Mortarboard top */}
                <polygon points="18,5 34,13 18,21 2,13" fill="#cdeafd" fillOpacity="0.18" stroke="#cdeafd" strokeWidth="1.6" strokeLinejoin="round"/>
                {/* Center gem */}
                <circle cx="18" cy="13" r="2.8" fill="#cdeafd"/>
                {/* Tassel string */}
                <line x1="34" y1="13" x2="34" y2="22" stroke="#cdeafd" strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="34" cy="23.5" r="1.8" fill="#cdeafd" fillOpacity="0.7"/>
                {/* Gown sides */}
                <path d="M9 18.5v6.5c0 2.2 4 4 9 4s9-1.8 9-4v-6.5" stroke="#cdeafd" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ color: '#cdeafd' }}>Học sinh</h1>
              <div className="subtitle" style={{ color: '#8fa0be', letterSpacing: '1.5px' }}>STUDENT PORTAL</div>
            </div>
          </div>

          <div className="sidebar-user-card" style={{ marginTop: 20, background: 'rgba(205,234,253,0.06)', borderColor: 'rgba(205,234,253,0.15)' }}>
            <div className="sidebar-user-avatar fallback" style={{ background: 'linear-gradient(135deg, #cdeafd22, #0c647b)', border: '1.5px solid rgba(205,234,253,0.3)', color: '#cdeafd', fontWeight: 700 }}>
              {student.name.split(' ').pop().slice(0, 2).toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name" style={{ color: '#cdeafd', fontWeight: 600 }}>
                {student.name.split(' ').slice(-2).join(' ')}
              </div>
              <div className="sidebar-user-code" style={{ color: '#8fa0be' }}>{student.username}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('assignments'); setAnalysisResult(null); setSelectedAssignment(null); setPreviews([]); }}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V3c0-1.1.9-2 2-2h14v21H6.5c-1.1 0-2.5-.9-2.5-2.5z"/>
              </svg>
            </span>
            Bài tập
          </div>
          <div
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setAnalysisResult(null); setSelectedAssignment(null); setPreviews([]); }}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10M18 20V4M6 20v-4"/>
              </svg>
            </span>
            Lịch sử nộp bài
          </div>
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            style={{ width: '100%', justifyContent: 'center', background: 'transparent', borderColor: 'var(--sidebar-border)', color: 'var(--sidebar-text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <div className="page-header-title">
            <h2>{activeTab === 'assignments' ? 'Bài tập của tôi' : 'Lịch sử nộp bài'}</h2>
            <p>Học sinh: <strong>{student.name}</strong></p>
          </div>
          <div className="page-header-actions">
            {/* Notification button */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button className="header-icon-btn" title="Thông báo" style={{ position: 'relative' }} onClick={() => { setShowNotif(v => !v); setShowMsg(false); if (!showNotif) markAllRead(); }}>
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
              {showNotif && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 300, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Thông báo</span>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Xóa tất cả</button>
                    )}
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
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
            {/* Message button */}
            <div style={{ position: 'relative' }} ref={msgRef}>
              <button className="header-icon-btn" title="Tin nhắn" onClick={() => { setShowMsg(v => !v); setShowNotif(false); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
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
          {/* ─── Assignments Tab ─── */}
          {activeTab === 'assignments' && (
            assignments.length === 0 ? (
              <div className="card empty-state animate-fade">
                <div className="empty-state-icon">📝</div>
                <h3>Chưa có bài tập nào được giao</h3>
                <p>Giáo viên chưa giao bài tập nào cho lớp của bạn.</p>
              </div>
            ) : (
              <div className="grading-split animate-slide" style={{ gridTemplateColumns: selectedAssignment ? '1.1fr 1fr' : '1fr', transition: 'grid-template-columns 0.3s ease' }}>

                {/* Assignment list */}
                <div className="card" style={{ height: 'fit-content' }}>
                  <div className="card-header">
                    <span className="card-title">Danh sách bài tập</span>
                    <span className="badge">{assignments.length} bài</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}></th>
                        <th>Đề bài</th>
                        <th>Loại</th>
                        <th>Hạn nộp</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((asm) => {
                        const latestSub = getLatestSubmission(asm.id);
                        const expired = isExpired(asm.deadline);
                        const isSelected = selectedAssignment?.id === asm.id;

                        let statusText = 'Chưa nộp';
                        let statusClass = expired ? 'badge-danger' : 'badge-warning';
                        if (latestSub) { statusText = 'Đã nộp'; statusClass = 'badge-success'; }

                        return (
                          <tr
                            key={asm.id}
                            onClick={() => { setSelectedAssignment(asm); setPreviews([]); setAnalysisResult(null); }}
                            style={{ cursor: 'pointer', background: isSelected ? 'var(--accent-bg)' : undefined, fontWeight: isSelected ? 600 : 'normal' }}
                          >
                            <td><div className={`custom-checkbox ${latestSub ? 'checked' : ''}`}></div></td>
                            <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {asm.problem_text}
                            </td>
                            <td><span className="tag">{asm.type?.toUpperCase()}</span></td>
                            <td style={{ fontSize: 12, color: expired && !latestSub ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {new Date(asm.deadline).toLocaleDateString('vi-VN')}
                            </td>
                            <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Assignment detail + submission */}
                {selectedAssignment && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-slide">
                    {/* Assignment info */}
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">Chi tiết bài tập</span>
                        <button className="modal-close" onClick={() => setSelectedAssignment(null)}>✕</button>
                      </div>
                      <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>Đề bài</div>
                        <div style={{ fontSize: 14.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedAssignment.problem_text}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        <span>Loại: <strong>{selectedAssignment.type}</strong></span>
                        <span>Hạn nộp: <strong>{new Date(selectedAssignment.deadline).toLocaleString('vi-VN')}</strong></span>
                        {rubrics[selectedAssignment.id] && (
                          <span>
                            Rubric: <strong>{rubrics[selectedAssignment.id].title}</strong>
                            {' '}({rubrics[selectedAssignment.id].content?.milestones?.length ?? 0} milestone)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Submission area */}
                    {(() => {
                      const latestSub = getLatestSubmission(selectedAssignment.id);
                      const expired = isExpired(selectedAssignment.deadline);

                      if (analysisResult) {
                        return (
                          <div className="card">
                            <div className="card-header">
                              <span className="card-title" style={{ color: 'var(--success)' }}>Phân tích AI hoàn tất</span>
                              <button className="btn btn-secondary btn-sm" onClick={() => setAnalysisResult(null)}>← Quay lại</button>
                            </div>
                            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {(analysisResult.submission?.image_urls?.length > 0 ? analysisResult.submission.image_urls : [analysisResult.submission?.image_url]).filter(Boolean).map((url, i, arr) => (
                                <div key={i}>
                                  {arr.length > 1 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Trang {i + 1}</div>}
                                  <img src={getImageUrl(url)} alt={`Bài làm trang ${i + 1}`} style={{ maxHeight: 180, borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: '100%', objectFit: 'contain', background: '#f8f8f8' }} />
                                </div>
                              ))}
                            </div>
                            <MilestoneResult result={analysisResult.result} />
                          </div>
                        );
                      }

                      if (latestSub) {
                        const result = latestSub.results?.[0];
                        return (
                          <div className="card">
                            <div className="card-header">
                              <span className="card-title">Bài đã nộp</span>
                              {!expired && <span className="badge badge-success">Có thể nộp lại</span>}
                            </div>
                            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {(latestSub.image_urls?.length > 0 ? latestSub.image_urls : [latestSub.image_url]).filter(Boolean).map((url, i, arr) => (
                                <div key={i}>
                                  {arr.length > 1 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Trang {i + 1}</div>}
                                  <img src={getImageUrl(url)} alt={`Bài làm trang ${i + 1}`} style={{ maxHeight: 180, borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: '100%', objectFit: 'contain', background: '#f8f8f8' }} />
                                </div>
                              ))}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                              Nộp lúc: {new Date(latestSub.submitted_at).toLocaleString('vi-VN')}
                            </div>

                            {result ? <MilestoneResult result={result} /> : (
                              <div className="loading-state" style={{ padding: '16px 0' }}>
                                <div className="spinner"></div>
                                <p>Đang chờ kết quả phân tích AI...</p>
                              </div>
                            )}

                            {!expired && (
                              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Nộp lại bài (tối đa 5 ảnh, kéo thả để sắp xếp):</div>
                                <MultiImageUpload previews={previews} uploading={uploading} onFilesChange={handleFilesChange} onRemove={removePreview} onDragStart={handleDragStart} onDrop={handleDrop} />
                                {previews.length > 0 && (
                                  <button className="btn btn-primary btn-sm" onClick={handleUploadSubmit} disabled={uploading} style={{ marginTop: 10, width: '100%' }}>
                                    {uploading ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }}></div> Đang phân tích...</> : `🔄 Nộp lại (${previews.length} ảnh)`}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (expired) {
                        return (
                          <div className="card" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>⏰</div>
                            <h3>Đã hết hạn nộp bài</h3>
                            <p style={{ fontSize: 13 }}>Bài tập này đã quá hạn và bạn chưa nộp bài.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="card">
                          <div className="card-header">
                            <span className="card-title">Nộp bài làm</span>
                          </div>
                          {!rubrics[selectedAssignment.id] && (
                            <div style={{ padding: '8px 12px', background: 'rgba(251,191,36,.1)', border: '1px solid #d97706', borderRadius: 6, fontSize: 12.5, color: '#d97706', marginBottom: 12 }}>
                              Bài tập này chưa có rubric. Bạn vẫn có thể nộp, nhưng chưa thể nhận phân tích AI.
                            </div>
                          )}

                          <MultiImageUpload previews={previews} uploading={uploading} onFilesChange={handleFilesChange} onRemove={removePreview} onDragStart={handleDragStart} onDrop={handleDrop} />

                          {previews.length > 0 && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setPreviews([])} disabled={uploading}>Xóa tất cả</button>
                              <button className="btn btn-primary btn-sm" onClick={handleUploadSubmit} disabled={uploading} style={{ flex: 1 }}>
                                {uploading
                                  ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }}></div> Đang phân tích...</>
                                  : `Nộp bài (${previews.length} ảnh)`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )
          )}

          {/* ─── History Tab ─── */}
          {activeTab === 'history' && (
            submissions.length === 0 ? (
              <div className="card empty-state animate-fade">
                <div className="empty-state-icon">📋</div>
                <h3>Chưa có bài nộp nào</h3>
                <p>Bạn chưa nộp bất kỳ bài làm nào.</p>
              </div>
            ) : (
              <div className="card animate-slide">
                <div className="card-header">
                  <span className="card-title">Lịch sử nộp bài</span>
                  <span className="badge">{submissions.length} lần</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Bài tập</th>
                      <th>Thời gian nộp</th>
                      <th>Điểm</th>
                      <th>Milestone</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const res = sub.results?.[0];
                      const asm = assignments.find(a => rubrics[a.id]?.id === sub.rubric_id);
                      const milestones = res?.milestone_json || [];
                      const achieved = milestones.filter(m => m.achieved).length;
                      return (
                        <tr key={sub.id}>
                          <td>#{sub.id}</td>
                          <td>
                            <div style={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {asm?.problem_text ?? 'Bài tập #' + sub.rubric_id}
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>{new Date(sub.submitted_at).toLocaleString('vi-VN')}</td>
                          <td>
                            {res ? (
                              <strong style={{ color: 'var(--accent)', fontSize: 14 }}>{res.total_score}</strong>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chờ...</span>}
                          </td>
                          <td>
                            {res && milestones.length > 0
                              ? <span style={{ color: achieved === milestones.length ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>{achieved}/{milestones.length}</span>
                              : '-'}
                          </td>
                          <td>
                            {res?.needs_review
                              ? <span className="badge badge-warning">Chờ review</span>
                              : res
                                ? <span className="badge badge-success">Hoàn tất</span>
                                : <span className="badge badge-info">Đang xử lý</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
