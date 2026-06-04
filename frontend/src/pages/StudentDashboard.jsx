import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';

export default function StudentDashboard({ student, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [rubrics, setRubrics] = useState({});
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' or 'history'
  
  // Upload and grading states
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, [student.class_id, student.id]);

  async function loadData() {
    try {
      // 1. Get assignments for student's class
      const asmList = await api.getAssignmentsByClass(student.class_id);
      setAssignments(asmList);

      // 2. Get student's submission history
      const subList = await api.getSubmissionsByStudent(student.id);
      setSubmissions(subList);

      // 3. For each assignment, fetch rubrics
      const rubricMap = {};
      await Promise.all(
        asmList.map(async (asm) => {
          try {
            const r = await api.getRubricsByAssignment(asm.id);
            if (r && r.length > 0) {
              rubricMap[asm.id] = r[0]; // Take the first rubric
            }
          } catch {
            // ignore rubric fetch errors for some assignments
          }
        })
      );
      setRubrics(rubricMap);
      
      // Auto-select first assignment if none selected
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

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setGradingResult(null);
    }
  }

  async function handleUploadSubmit() {
    const rubric = rubrics[selectedAssignment.id];
    if (!rubric) {
      showToast('Bài tập này chưa được thiết lập rubric chấm điểm!', 'error');
      return;
    }
    if (!file) {
      showToast('Vui lòng chọn ảnh bài làm trước khi nộp.', 'error');
      return;
    }

    setUploading(true);
    setGradingResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('student_id', student.id);
      fd.append('rubric_id', rubric.id);

      const res = await api.gradeSubmission(fd);
      setGradingResult(res);
      showToast('Nộp bài và chấm điểm AI thành công!');
      
      // Reset upload fields
      setFile(null);
      setPreview(null);
      
      // Reload history and assignments
      loadData();
    } catch (err) {
      showToast(err.message || 'Nộp bài thất bại', 'error');
    } finally {
      setUploading(false);
    }
  }

  // Find latest submission for an assignment
  function getLatestSubmission(assignmentId) {
    const rubric = rubrics[assignmentId];
    if (!rubric) return null;
    const filtered = submissions.filter(sub => sub.rubric_id === rubric.id);
    if (filtered.length === 0) return null;
    
    // Sort by submitted_at desc
    return filtered.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
  }

  const confidenceColor = (c) => {
    if (c >= 0.8) return 'var(--success)';
    if (c >= 0.5) return 'var(--warning)';
    return 'var(--danger)';
  };

  const isExpired = (deadlineStr) => {
    return new Date(deadlineStr) < new Date();
  };

  return (
    <div className="app-layout" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {toast && createPortal(
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
        document.body
      )}

      {/* Student Sidebar */}
      <aside className="sidebar open">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🎓</div>
            <div>
              <h1>Học sinh Portal</h1>
              <div className="subtitle">Math Grading AI</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('assignments'); setGradingResult(null); }}
          >
            <span className="nav-icon">📝</span>
            Bài tập cần làm
          </div>
          <div
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setGradingResult(null); }}
          >
            <span className="nav-icon">📊</span>
            Lịch sử nộp bài
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                {student.name.split(' ').pop().slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="user-name">{student.name}</div>
                <div className="user-role">{student.username}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={onLogout} title="Đăng xuất">
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Student Main Content */}
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>{activeTab === 'assignments' ? 'Danh sách Bài tập được giao' : 'Lịch sử nộp bài của bạn'}</h2>
            <p>Học sinh: <strong>{student.name}</strong> • Mã số: <strong>{student.username}</strong></p>
          </div>
        </div>

        <div className="page-body">
          {activeTab === 'assignments' && (
            assignments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3>Chưa có bài tập nào được giao</h3>
                <p>Giáo viên chưa giao bài tập nào cho lớp của bạn.</p>
              </div>
            ) : (
              <div className="grading-split" style={{ gridTemplateColumns: '320px 1fr' }}>
                {/* Left panel: Assignment list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {assignments.map(asm => {
                    const latestSub = getLatestSubmission(asm.id);
                    const expired = isExpired(asm.deadline);
                    const isSelected = selectedAssignment?.id === asm.id;
                    
                    return (
                      <div
                        key={asm.id}
                        className={`card ${isSelected ? 'active-card' : ''}`}
                        style={{
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                          background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)'
                        }}
                        onClick={() => {
                          setSelectedAssignment(asm);
                          setFile(null);
                          setPreview(null);
                          setGradingResult(null);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span className={`badge ${expired ? 'badge-danger' : 'badge-success'}`}>
                            {expired ? 'Hết hạn' : 'Đang mở'}
                          </span>
                          {latestSub && (
                            <span className="badge badge-violet">
                              Điểm: {latestSub.results?.[0]?.total_score ?? 'Chờ chấm'}
                            </span>
                          )}
                        </div>
                        <div className="user-name" style={{ fontSize: 14, marginBottom: 6 }}>
                          Bài tập #{asm.id} ({asm.type})
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {asm.problem_text}
                        </p>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                          Hạn chót: {new Date(asm.deadline).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right panel: Selected Assignment Details & Submission */}
                {selectedAssignment && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">📝 Chi tiết bài tập #{selectedAssignment.id}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Hạn nộp: {new Date(selectedAssignment.deadline).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      
                      <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
                          Đề bài:
                        </div>
                        <div style={{ fontSize: 15, whiteSpace: 'pre-wrap' }}>{selectedAssignment.problem_text}</div>
                      </div>

                      {rubrics[selectedAssignment.id] && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          💡 Rubric chấm điểm: <strong>{rubrics[selectedAssignment.id].title}</strong> (Tổng điểm: {rubrics[selectedAssignment.id].content?.total_score ?? 10})
                        </div>
                      )}
                    </div>

                    {/* Submission status or Form */}
                    {(() => {
                      const latestSub = getLatestSubmission(selectedAssignment.id);
                      const expired = isExpired(selectedAssignment.deadline);

                      // If AI graded this session, display it immediately
                      if (gradingResult) {
                        return (
                          <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                              <h3 style={{ color: 'var(--success)' }}>✅ AI Đã Chấm Điểm Xong!</h3>
                              <button className="btn btn-secondary btn-sm" onClick={() => setGradingResult(null)}>
                                Xem bài nộp trước đó
                              </button>
                            </div>
                            
                            <div className="grading-split" style={{ gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
                              <div className="grading-image-panel" style={{ minHeight: 250 }}>
                                <img src={getImageUrl(gradingResult.submission.image_url)} alt="Bài làm học sinh" />
                              </div>
                              <div className="grading-detail-panel">
                                <div className="score-hero" style={{ padding: 16 }}>
                                  <div className="score-value">
                                    {gradingResult.result.total_score}
                                    <span className="score-max">/{rubrics[selectedAssignment.id]?.content?.total_score || 10}</span>
                                  </div>
                                  <div className="confidence-bar">
                                    <span className="confidence-label">Độ tin cậy: {(gradingResult.result.confidence * 100).toFixed(0)}%</span>
                                    <div className="confidence-track">
                                      <div className="confidence-fill" style={{ width: `${gradingResult.result.confidence * 100}%`, background: confidenceColor(gradingResult.result.confidence) }} />
                                    </div>
                                  </div>
                                </div>

                                {gradingResult.result.steps_json?.criteria_scores?.map((cs, i) => (
                                  <div key={i} className="criterion-card" style={{ padding: 10 }}>
                                    <div className="criterion-header" style={{ marginBottom: 4 }}>
                                      <span className="criterion-name" style={{ fontSize: 13 }}>{cs.criterion_name}</span>
                                      <span className="criterion-score" style={{ fontSize: 13 }}>{cs.awarded_score}/{cs.max_score}</span>
                                    </div>
                                    <div className="criterion-reasoning" style={{ fontSize: 11.5 }}>{cs.reasoning}</div>
                                  </div>
                                ))}

                                {gradingResult.result.steps_json?.overall_feedback && (
                                  <div className="criterion-card" style={{ padding: 10, borderColor: 'var(--border-strong)' }}>
                                    <div className="criterion-name" style={{ fontSize: 13, marginBottom: 4 }}>💡 Nhận xét:</div>
                                    <div className="criterion-reasoning" style={{ fontSize: 11.5 }}>{gradingResult.result.steps_json.overall_feedback}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // If there is an existing submission, show it
                      if (latestSub) {
                        const result = latestSub.results?.[0];
                        return (
                          <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                              <span className="card-title">📤 Bài làm đã nộp (Lúc {new Date(latestSub.submitted_at).toLocaleString('vi-VN')})</span>
                              {!expired && (
                                <span className="badge badge-success">Vẫn có thể nộp lại (trước khi hết hạn)</span>
                              )}
                            </div>

                            <div className="grading-split" style={{ gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
                              <div className="grading-image-panel" style={{ minHeight: 250 }}>
                                <img src={getImageUrl(latestSub.image_url)} alt="Bài làm" />
                              </div>

                              <div className="grading-detail-panel">
                                {result ? (
                                  <>
                                    <div className="score-hero" style={{ padding: 16 }}>
                                      <div className="score-value">
                                        {result.total_score}
                                        <span className="score-max">/{rubrics[selectedAssignment.id]?.content?.total_score || 10}</span>
                                      </div>
                                      <div className="confidence-bar">
                                        <span className="confidence-label">Độ tin cậy: {(result.confidence * 100).toFixed(0)}%</span>
                                        <div className="confidence-track">
                                          <div className="confidence-fill" style={{ width: `${result.confidence * 100}%`, background: confidenceColor(result.confidence) }} />
                                        </div>
                                      </div>
                                    </div>

                                    {result.steps_json?.criteria_scores?.map((cs, idx) => (
                                      <div key={idx} className="criterion-card" style={{ padding: 10 }}>
                                        <div className="criterion-header" style={{ marginBottom: 4 }}>
                                          <span className="criterion-name" style={{ fontSize: 13 }}>{cs.criterion_name}</span>
                                          <span className="criterion-score" style={{ fontSize: 13 }}>{cs.awarded_score}/{cs.max_score}</span>
                                        </div>
                                        <div className="criterion-reasoning" style={{ fontSize: 11.5 }}>{cs.reasoning}</div>
                                      </div>
                                    ))}

                                    {result.steps_json?.overall_feedback && (
                                      <div className="criterion-card" style={{ padding: 10, borderColor: 'var(--border-strong)' }}>
                                        <div className="criterion-name" style={{ fontSize: 13, marginBottom: 4 }}>💡 Nhận xét AI:</div>
                                        <div className="criterion-reasoning" style={{ fontSize: 11.5 }}>{result.steps_json.overall_feedback}</div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="loading-state" style={{ padding: 30 }}>
                                    <div className="spinner"></div>
                                    <p>Đang chờ chấm điểm hoặc xử lý AI...</p>
                                  </div>
                                )}

                                {/* Form to upload and re-submit if not expired */}
                                {!expired && (
                                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 12 }}>
                                    <div className="form-group" style={{ marginBottom: 12 }}>
                                      <label className="form-label" style={{ fontSize: 12 }}>Chọn ảnh bài làm mới để nộp lại:</label>
                                      <input type="file" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    {preview && (
                                      <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                        <img src={preview} alt="Xem trước" style={{ maxHeight: 150, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                                      </div>
                                    )}
                                    {preview && (
                                      <button className="btn btn-primary" onClick={handleUploadSubmit} disabled={uploading} style={{ width: '100%' }}>
                                        {uploading ? 'Đang nộp bài...' : '🔄 Nộp lại bài làm'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // If no submission and expired, show expired
                      if (expired) {
                        return (
                          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>⏰</div>
                            <h3>Đã hết hạn nộp bài</h3>
                            <p>Bài tập này đã quá hạn nộp bài ({new Date(selectedAssignment.deadline).toLocaleString('vi-VN')}) và bạn chưa nộp bài.</p>
                          </div>
                        );
                      }

                      // If no submission and open, show upload form
                      return (
                        <div className="card">
                          <div className="card-header">
                            <span className="card-title">📤 Tiến hành nộp bài</span>
                          </div>

                          {!preview ? (
                            <div className="file-upload">
                              <input type="file" accept="image/*" onChange={handleFileChange} />
                              <div className="file-upload-icon">📷</div>
                              <div className="file-upload-text">
                                Nhấp chọn hoặc <strong>kéo thả ảnh</strong> chụp bài làm viết tay của bạn
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <img src={preview} alt="Xem trước bài nộp" style={{ maxHeight: 280, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }} />
                              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => { setFile(null); setPreview(null); }} disabled={uploading}>
                                  🔄 Chọn ảnh khác
                                </button>
                                <button className="btn btn-primary" onClick={handleUploadSubmit} disabled={uploading}>
                                  {uploading ? (
                                    <><div className="spinner" style={{ width: 14, height: 14 }}></div> Đang tải lên và chấm bài...</>
                                  ) : (
                                    '🚀 Nộp bài làm'
                                  )}
                                </button>
                              </div>
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

          {activeTab === 'history' && (
            submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>Lịch sử bài nộp trống</h3>
                <p>Bạn chưa nộp bất kỳ bài làm nào trên hệ thống.</p>
              </div>
            ) : (
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Bài tập</th>
                      <th>Thời gian nộp</th>
                      <th>Điểm số</th>
                      <th>Độ tin cậy</th>
                      <th>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const res = sub.results?.[0];
                      // Find problem text
                      const asm = assignments.find(a => rubrics[a.id]?.id === sub.rubric_id);
                      return (
                        <tr key={sub.id}>
                          <td>#{sub.id}</td>
                          <td>
                            <strong>Bài tập #{asm?.id ?? '?'}</strong>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 300, whiteSpace: 'nowrap' }}>
                              {asm?.problem_text ?? 'Đề bài không xác định'}
                            </div>
                          </td>
                          <td>{new Date(sub.submitted_at).toLocaleString('vi-VN')}</td>
                          <td>
                            <strong style={{ color: 'var(--accent-light)', fontSize: 14 }}>
                              {res ? `${res.total_score} điểm` : 'Chờ chấm'}
                            </strong>
                          </td>
                          <td>
                            {res ? (
                              <span style={{ color: confidenceColor(res.confidence), fontWeight: 600 }}>
                                {(res.confidence * 100).toFixed(0)}%
                              </span>
                            ) : '-'}
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                if (asm) {
                                  setSelectedAssignment(asm);
                                  setActiveTab('assignments');
                                  setFile(null);
                                  setPreview(null);
                                  setGradingResult(null);
                                }
                              }}
                            >
                              🔍 Xem chi tiết
                            </button>
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
