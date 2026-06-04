import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';

export default function ResultsPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [rubrics, setRubrics] = useState([]);
  const [selectedRubric, setSelectedRubric] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getAssignments().then(setAssignments).catch(() => {});
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAssignmentChange(e) {
    const id = e.target.value;
    setSelectedAssignment(id);
    setSelectedRubric('');
    setSubmissions([]);
    setSelectedSubmission(null);
    setResults([]);
    if (id) {
      try {
        const r = await api.getRubricsByAssignment(id);
        setRubrics(r);
      } catch { /* ignore */ }
    }
  }

  async function handleRubricChange(e) {
    const id = e.target.value;
    setSelectedRubric(id);
    setSelectedSubmission(null);
    setResults([]);
    if (id) {
      setLoading(true);
      try {
        const subs = await api.getSubmissionsByRubric(id);
        setSubmissions(subs);
      } catch (err) { showToast(err.message, 'error'); }
      finally { setLoading(false); }
    }
  }

  async function handleSelectSubmission(sub) {
    setSelectedSubmission(sub);
    try {
      const res = await api.getResultsBySubmission(sub.id);
      setResults(res);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleSaveFeedback(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      result_id: feedbackTarget.id,
      user_id: 1,
      final_score: parseFloat(fd.get('final_score')),
      note: fd.get('note') || null,
    };
    try {
      await api.addFeedback(data);
      showToast('Đã lưu đánh giá của giáo viên');
      setShowFeedback(false);
      // Reload results
      const res = await api.getResultsBySubmission(selectedSubmission.id);
      setResults(res);
    } catch (err) { showToast(err.message, 'error'); }
  }

  const confidenceColor = (c) => {
    if (c >= 0.8) return 'var(--success)';
    if (c >= 0.5) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="animate-fade">
      {toast && createPortal(
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
        document.body
      )}

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bài tập</label>
            <select className="form-select" value={selectedAssignment} onChange={handleAssignmentChange}>
              <option value="">-- Chọn bài tập --</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>#{a.id} – {a.problem_text.slice(0, 40)}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Rubric</label>
            <select className="form-select" value={selectedRubric} onChange={handleRubricChange} disabled={rubrics.length === 0}>
              <option value="">-- Chọn rubric --</option>
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state"><div className="spinner spinner-lg"></div><span>Đang tải bài nộp...</span></div>
      )}

      {!loading && selectedRubric && submissions.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Chưa có bài nộp</h3>
          <p>Chưa có học sinh nào nộp bài cho rubric này</p>
        </div>
      )}

      {/* Submissions List & Detail */}
      {submissions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSubmission ? '350px 1fr' : '1fr', gap: 24 }}>
          {/* Submissions List */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📄 Bài nộp ({submissions.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubmission(sub)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedSubmission?.id === sub.id ? 'var(--accent-bg)' : 'var(--bg-base)',
                    borderColor: selectedSubmission?.id === sub.id ? 'var(--border-strong)' : 'var(--border)',
                    transition: 'all var(--duration) var(--ease)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Bài #{sub.id}</span>
                    <span className="tag">HS #{sub.student_id}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(sub.submitted_at).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail View */}
          {selectedSubmission && (
            <div className="animate-slide">
              <div className="grading-split">
                {/* Image */}
                <div className="grading-image-panel">
                  <img src={getImageUrl(selectedSubmission.image_url)} alt="Bài làm" />
                </div>

                {/* Results */}
                <div className="grading-detail-panel">
                  {results.length === 0 ? (
                    <div className="empty-state">
                      <h3>Chưa có kết quả chấm</h3>
                    </div>
                  ) : results.map((r) => (
                    <div key={r.id}>
                      {/* Score */}
                      <div className="score-hero" style={{ marginBottom: 16 }}>
                        <div className="score-value">{r.total_score}</div>
                        <div className="confidence-bar">
                          <span className="confidence-label">Độ tin cậy:</span>
                          <div className="confidence-track">
                            <div className="confidence-fill" style={{
                              width: `${(r.confidence * 100).toFixed(0)}%`,
                              background: confidenceColor(r.confidence),
                            }} />
                          </div>
                          <span className="confidence-label" style={{ color: confidenceColor(r.confidence), fontWeight: 600 }}>
                            {(r.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Criteria */}
                      {r.steps_json?.criteria_scores?.map((cs, i) => (
                        <div key={i} className="criterion-card" style={{ marginBottom: 10 }}>
                          <div className="criterion-header">
                            <span className="criterion-name">{cs.criterion_name}</span>
                            <span className="criterion-score">{cs.awarded_score}/{cs.max_score}</span>
                          </div>
                          <div className="criterion-reasoning">{cs.reasoning}</div>
                        </div>
                      ))}

                      {r.steps_json?.overall_feedback && (
                        <div className="criterion-card" style={{ marginBottom: 16, borderColor: 'var(--border-strong)' }}>
                          <div className="criterion-name" style={{ marginBottom: 8 }}>💡 Nhận xét tổng thể</div>
                          <div className="criterion-reasoning">{r.steps_json.overall_feedback}</div>
                        </div>
                      )}

                      {/* Teacher Feedback */}
                      <div className="feedback-section">
                        <h4>✍️ Đánh giá của giáo viên</h4>
                        {r.teacher_feedback_id ? (
                          <div>
                            <span className="badge badge-success">Đã đánh giá</span>
                          </div>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => { setFeedbackTarget(r); setShowFeedback(true); }}>
                            + Thêm đánh giá
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* OCR */}
                  {selectedSubmission.ocr_text && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                        📝 Nội dung OCR
                      </div>
                      <div className="ocr-box">{selectedSubmission.ocr_text}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && feedbackTarget && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Đánh giá của giáo viên</h3>
              <button className="modal-close" onClick={() => setShowFeedback(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveFeedback}>
              <div className="modal-body">
                <div style={{ padding: '12px 14px', background: 'var(--bg-base)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>
                  <strong>Điểm AI:</strong> {feedbackTarget.total_score} |{' '}
                  <strong>Độ tin cậy:</strong> {(feedbackTarget.confidence * 100).toFixed(0)}%
                </div>
                <div className="form-group">
                  <label className="form-label">Điểm cuối cùng (giáo viên)</label>
                  <input className="form-input" name="final_score" type="number" step="0.5" min="0" defaultValue={feedbackTarget.total_score} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú / Nhận xét</label>
                  <textarea className="form-textarea" name="note" rows="3" placeholder="Nhận xét thêm cho học sinh..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFeedback(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">💾 Lưu đánh giá</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
