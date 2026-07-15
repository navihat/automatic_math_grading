import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';
import { Latex, MixedLatex } from '../components/Latex';

const TABS = [
  ['ocr', '📝 OCR'],
  ['steps', '📋 Bước giải'],
  ['verification', '🔬 Kiểm chứng'],
  ['milestones', '🎯 Milestone'],
  ['misconceptions', '⚠️ Lỗi suy luận'],
  ['feedback', '💬 Phản hồi'],
];

export default function ResultsPage({ teacherId }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [rubrics, setRubrics] = useState([]);
  const [selectedRubric, setSelectedRubric] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('feedback');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getAssignments(teacherId).then(setAssignments).catch(() => {});
  }, [teacherId]);

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAssignmentChange(e) {
    const id = e.target.value;
    setSelectedAssignment(id);
    setSelectedRubric('');
    setSubmissions([]);
    setSelectedSub(null);
    setResult(null);
    if (id) {
      try { setRubrics(await api.getRubricsByAssignment(id)); }
      catch { /* ignore */ }
    } else { setRubrics([]); }
  }

  async function handleRubricChange(e) {
    const id = e.target.value;
    setSelectedRubric(id);
    setSelectedSub(null);
    setResult(null);
    if (id) {
      setLoading(true);
      try { setSubmissions(await api.getSubmissionsByRubric(id)); }
      catch (err) { showToast(err.message, 'error'); }
      finally { setLoading(false); }
    } else { setSubmissions([]); }
  }

  async function handleSelectSub(sub) {
    setSelectedSub(sub);
    setResult(null);
    setActiveTab('feedback');
    try {
      const results = await api.getResultsBySubmission(sub.id);
      if (results?.length > 0) {
        const detail = await api.getResult(results[0].id);
        setResult(detail);
      }
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleSaveFeedback(e) {
    e.preventDefault();
    if (!result) return;
    setSavingFeedback(true);
    const fd = new FormData(e.target);
    try {
      const data = { result_id: result.id, user_id: teacherId, final_score: parseFloat(fd.get('final_score')), note: fd.get('note') || null };
      await api.addFeedback(data);
      showToast('Đã lưu đánh giá');
      setShowFeedbackModal(false);
      const detail = await api.getResult(result.id);
      setResult(detail);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingFeedback(false); }
  }

  const confColor = (c) => c >= 0.7 ? 'var(--success)' : c >= 0.4 ? 'var(--warning)' : 'var(--danger)';
  const milestones = result?.milestones || result?.milestone_json || [];
  const misconceptions = result?.misconceptions || result?.misconception_json || [];
  const steps = result?.steps || result?.steps_json || [];
  const ir = result?.ir || result?.ir_json || [];
  const verification = result?.verification || result?.verification_json || [];
  const quality = result?.image_quality || result?.image_quality_json;

  return (
    <div className="animate-fade">
      {toast && createPortal(<div className={`toast toast-${toast.type}`}>{toast.message}</div>, document.body)}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bài tập</label>
            <select className="form-select" value={selectedAssignment} onChange={handleAssignmentChange}>
              <option value="">-- Chọn bài tập --</option>
              {assignments.map(a => <option key={a.id} value={a.id}>#{a.id} – {a.problem_text.slice(0, 40)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Rubric</label>
            <select className="form-select" value={selectedRubric} onChange={handleRubricChange} disabled={!rubrics.length}>
              <option value="">-- Chọn rubric --</option>
              {rubrics.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state"><div className="spinner spinner-lg"></div><span>Đang tải...</span></div>}

      {!loading && selectedRubric && !submissions.length && (
        <div className="empty-state"><div className="empty-state-icon">📋</div><h3>Chưa có bài nộp</h3></div>
      )}

      {submissions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSub ? '300px 1fr' : '1fr', gap: 24 }}>
          {/* Submission list */}
          <div className="card">
            <div className="card-header"><span className="card-title">📄 Bài nộp ({submissions.length})</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {submissions.map(sub => {
                const res = sub.results?.[0];
                return (
                  <div key={sub.id} onClick={() => handleSelectSub(sub)}
                    style={{ padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'pointer', background: selectedSub?.id === sub.id ? 'var(--accent-bg)' : 'var(--bg-base)', borderColor: selectedSub?.id === sub.id ? 'var(--border-strong)' : 'var(--border)', transition: 'all var(--duration) var(--ease)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Bài #{sub.id}</span>
                      {res ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)' }}>{res.total_score}/{res.total_milestones}</span>
                      ) : <span className="badge" style={{ fontSize: 10 }}>Chưa phân tích</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>HS #{sub.student_id}</span>
                      <span>{new Date(sub.submitted_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {res?.needs_review && <div style={{ fontSize: 11, color: '#d97706', marginTop: 3 }}>⚠️ Cần xem lại</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selectedSub && (
            <div className="animate-slide">
              {/* Top: image + meta */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
                  <div>
                    <img src={getImageUrl(selectedSub.image_url)} alt="Bài làm" style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    {!result ? (
                      <div className="empty-state" style={{ padding: 20 }}>
                        <p style={{ fontStyle: 'italic', fontSize: 13 }}>Bài nộp này chưa có kết quả phân tích. Vào trang Chấm điểm AI để phân tích.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Summary scores */}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'center', background: 'var(--accent-bg)', borderRadius: 'var(--radius)', padding: '12px 20px', border: '1px solid var(--border-strong)' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-light)' }}>
                              {result.total_score}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/{result.total_milestones}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Milestone đạt</div>
                          </div>
                          {quality && (
                            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chất lượng ảnh</span>
                                <span style={{ fontWeight: 700, color: confColor(quality.confidence) }}>{(quality.confidence * 100).toFixed(0)}%</span>
                              </div>
                              <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>Độ sắc nét: {quality.is_sharp ? '✅' : '❌'}</span>
                                <span>Độ tương phản: {quality.has_contrast ? '✅' : '❌'}</span>
                              </div>
                              {quality.warning && <span style={{ fontSize: 11, color: 'var(--warning)' }}>⚠️ {quality.warning}</span>}
                            </div>
                          )}
                          {result.needs_review && (
                            <span className="badge" style={{ alignSelf: 'flex-start', background: 'rgba(251,191,36,.15)', color: '#d97706' }}>⚠️ Cần xem lại</span>
                          )}
                        </div>

                        {/* Teacher feedback status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {result.teacher_feedback ? (
                            <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                              ✅ Điểm giáo viên: {result.teacher_feedback.final_score}
                              {result.teacher_feedback.note && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>"{result.teacher_feedback.note}"</span>}
                            </div>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowFeedbackModal(true)}>✍️ Thêm đánh giá GV</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {result && (
                <div className="card">
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0, marginBottom: 16, flexWrap: 'wrap' }}>
                    {TABS.map(([id, label]) => (
                      <button key={id} onClick={() => setActiveTab(id)}
                        style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', borderBottom: activeTab === id ? '2px solid var(--accent-light)' : '2px solid transparent', background: 'none', color: activeTab === id ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* OCR Tab */}
                  {activeTab === 'ocr' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Văn bản trích xuất</div>
                        <div className="ocr-box" style={{ fontSize: 13, lineHeight: 1.8 }}>
                          {result.ocr_text
                            ? <MixedLatex text={result.ocr_text} />
                            : '(không có dữ liệu OCR)'}
                        </div>
                      </div>
                      {result.uncertain_symbols?.length > 0 && (
                        <div style={{ padding: 12, background: 'rgba(251,191,36,.08)', borderRadius: 'var(--radius)', border: '1px solid rgba(251,191,36,.3)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>⚠️ Ký hiệu không chắc chắn (Gemini tự báo cáo)</div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
                            {result.uncertain_symbols.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Steps Tab */}
                  {activeTab === 'steps' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {steps.length === 0 && ir.length === 0
                        ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Không có dữ liệu bước giải.</div>
                        : (steps.length ? steps : ir).map((s, i) => {
                          const verif = verification.find(v => v.from_step === (s.step_no || i + 1));
                          const valid = verif?.is_valid;
                          return (
                            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-base)', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: 800, color: 'var(--accent-light)', fontSize: 14, minWidth: 28, paddingTop: 2 }}>#{s.step_no || i + 1}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)', overflowX: 'auto' }}>
                                  {s.latex
                                    ? <Latex block>{s.latex}</Latex>
                                    : s.lhs && s.rhs
                                      ? <Latex block>{`${s.lhs} = ${s.rhs}`}</Latex>
                                      : <span style={{ fontFamily: 'monospace' }}>{s.raw_text}</span>}
                                </div>
                                {s.raw_text && s.latex && s.raw_text !== s.latex && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Gốc: {s.raw_text}</div>
                                )}
                                {s.operation && s.operation !== 'equation' && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Thao tác: {s.operation}</div>
                                )}
                              </div>
                              {valid !== undefined && (
                                <span style={{ fontSize: 14 }}>{valid === true ? '✅' : valid === false ? '❌' : '❓'}</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Verification Tab */}
                  {activeTab === 'verification' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {verification.length === 0
                        ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Không có dữ liệu kiểm chứng ký hiệu (cần ít nhất 2 bước có phương trình).</div>
                        : verification.map((v, i) => (
                          <div key={i} style={{ padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: v.is_valid === true ? 'rgba(34,197,94,.05)' : v.is_valid === false ? 'rgba(239,68,68,.05)' : 'var(--bg-base)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 13 }}>
                              <span style={{ fontSize: 18 }}>{v.is_valid === true ? '✅' : v.is_valid === false ? '❌' : '❓'}</span>
                              <span>Bước {v.from_step} → Bước {v.to_step}</span>
                              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 'auto' }}>Phương pháp: {v.method}</span>
                            </div>
                            {v.error_description && (
                              <div style={{ marginTop: 8, paddingLeft: 28, fontSize: 12, color: 'var(--danger)', lineHeight: 1.6 }}>
                                <MixedLatex text={v.error_description} />
                              </div>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {/* Milestones Tab */}
                  {activeTab === 'milestones' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {milestones.length === 0
                        ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Không có milestone.</div>
                        : milestones.map((m, i) => (
                          <div key={i} style={{ padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: m.achieved ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 14 }}>
                              <span style={{ fontSize: 18 }}>{m.achieved ? '✅' : '❌'}</span>
                              {m.name}
                            </div>
                            {m.evidence && <div style={{ marginTop: 6, paddingLeft: 28, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{m.evidence}</div>}
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {/* Misconceptions Tab */}
                  {activeTab === 'misconceptions' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {misconceptions.length === 0
                        ? <div style={{ color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>✅ Không phát hiện lỗi suy luận điển hình.</div>
                        : misconceptions.map((m, i) => (
                          <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius)', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--danger)' }}>{m.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>({m.code})</span>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {m.step_no && <span className="tag">Bước {m.step_no}</span>}
                                <span className="badge" style={{ fontSize: 11, background: m.confidence === 'high' ? 'rgba(239,68,68,.1)' : 'rgba(251,191,36,.1)', color: m.confidence === 'high' ? 'var(--danger)' : '#d97706' }}>
                                  {m.confidence === 'high' ? 'Tin cậy cao' : m.confidence === 'medium' ? 'Tin cậy vừa' : 'Tin cậy thấp'}
                                </span>
                              </div>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{m.detail}</div>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {/* Feedback Tab */}
                  {activeTab === 'feedback' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-light)', marginBottom: 10 }}>💬 Phản hồi chẩn đoán (AI)</div>
                        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)' }}>
                          {result.feedback_text
                            ? <MixedLatex text={result.feedback_text} />
                            : '(Chưa có phản hồi)'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                        <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-light)' }}>{milestones.filter(m => m.achieved).length}/{milestones.length}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Milestone đạt</div>
                        </div>
                        <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: misconceptions.length ? 'var(--danger)' : 'var(--success)' }}>{misconceptions.length}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Lỗi suy luận</div>
                        </div>
                        <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: verification.filter(v => v.is_valid === false).length ? 'var(--danger)' : 'var(--success)' }}>
                            {verification.filter(v => v.is_valid === false).length}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Bước sai (SymPy)</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Teacher feedback modal */}
      {showFeedbackModal && result && createPortal(
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✍️ Đánh giá của giáo viên</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveFeedback}>
              <div className="modal-body">
                <div style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>
                  <strong>Pipeline AI:</strong> {result.total_score}/{result.total_milestones} milestone đạt &nbsp;|&nbsp;
                  <strong>Ảnh:</strong> {quality ? (quality.is_acceptable ? '✅ Tốt' : '⚠️ Chất lượng thấp') : 'N/A'}
                </div>
                <div className="form-group">
                  <label className="form-label">Điểm cuối (giáo viên quyết định)</label>
                  <input className="form-input" name="final_score" type="number" step="0.5" min="0" defaultValue={result.total_score} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú / Nhận xét thêm</label>
                  <textarea className="form-textarea" name="note" rows="3" placeholder="Nhận xét chi tiết cho học sinh..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFeedbackModal(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary" disabled={savingFeedback}>
                  {savingFeedback ? 'Đang lưu...' : '💾 Lưu đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
