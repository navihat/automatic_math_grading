import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';

import { NOTIF_TYPES } from '../hooks/useNotifications';
import { Latex, MixedLatex } from '../components/Latex';

export default function GradingPage({ teacherId, onNotify }) {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [rubric, setRubric] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [selectedSub, setSelectedSub] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [overrideScore, setOverrideScore] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([api.getAssignments(teacherId), api.getClasses(teacherId)])
      .then(([a, c]) => { setAssignments(a); setClasses(c); })
      .catch(() => {});
  }, [teacherId]);

  useEffect(() => {
    if (selectedAssignment && selectedClass) loadData();
    else { setStudents([]); setSubmissions([]); setRubric(null); }
  }, [selectedAssignment, selectedClass]);

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadData() {
    setLoading(true);
    try {
      const rubricsList = await api.getRubricsByAssignment(selectedAssignment);
      let rub = null, subsList = [];
      if (rubricsList?.length > 0) {
        rub = rubricsList[0];
        setRubric(rub);
        subsList = await api.getSubmissionsByRubric(rub.id);
      } else {
        setRubric(null);
        showToast('Bài tập này chưa có Rubric milestone!', 'error');
      }
      const studsList = await api.getStudents(selectedClass);
      setStudents(studsList);
      setSubmissions(subsList);
    } catch (err) {
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally { setLoading(false); }
  }

  function getStudentSub(studentId) {
    if (!rubric) return null;
    const list = submissions.filter(s => s.student_id === studentId);
    return list.length ? list.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0] : null;
  }

  async function handleAnalyze(studentId) {
    const sub = getStudentSub(studentId);
    if (!sub) { showToast('Học sinh chưa nộp bài.', 'error'); return; }
    setAnalyzingId(studentId);
    try {
      showToast('Đang chạy pipeline phân tích lời giải...');
      const res = await api.regradeSubmission(sub.id);
      setSubmissions(prev => prev.map(s => s.id === sub.id
        ? { ...s, ocr_text: res.submission.ocr_text, results: [res.result] }
        : s));
      const scoreMsg = `${res.result.total_score}/${res.result.total_milestones} milestone`;
      showToast(`Phân tích xong! Milestone đạt: ${scoreMsg}`);
      const st = students.find(s => s.id === studentId);
      onNotify?.(NOTIF_TYPES.GRADING_DONE, 'Kết quả chấm xong', `${st?.name ?? 'Học sinh'}: ${scoreMsg}`);
    } catch (err) {
      showToast('Phân tích thất bại: ' + err.message, 'error');
    } finally { setAnalyzingId(null); }
  }

  async function handleAnalyzeAll() {
    const withSubs = students.map(s => ({ student: s, sub: getStudentSub(s.id) })).filter(x => x.sub);
    if (!withSubs.length) { showToast('Không có bài nộp nào!', 'error'); return; }
    setAnalyzingAll(true);
    setProgress({ current: 0, total: withSubs.length, name: '' });
    let ok = 0;
    for (let i = 0; i < withSubs.length; i++) {
      const { student, sub } = withSubs[i];
      setProgress({ current: i + 1, total: withSubs.length, name: student.name });
      try {
        const res = await api.regradeSubmission(sub.id);
        setSubmissions(prev => prev.map(s => s.id === sub.id
          ? { ...s, ocr_text: res.submission.ocr_text, results: [res.result] }
          : s));
        ok++;
      } catch (err) { console.error(student.name, err); }
    }
    setAnalyzingAll(false);
    showToast(`Hoàn tất! Phân tích thành công ${ok}/${withSubs.length} bài.`);
    onNotify?.(NOTIF_TYPES.GRADING_DONE, 'Phân tích cả lớp xong', `${ok}/${withSubs.length} bài thành công`);
  }

  function openDetails(sub) {
    setSelectedSub(sub);
    setActiveTab('summary');
    const result = sub.results?.[0];
    setOverrideScore(result?.teacher_feedback?.final_score ?? result?.total_score ?? '');
    setFeedbackNote(result?.teacher_feedback?.note ?? '');
    setShowModal(true);
  }

  async function handleSaveFeedback(e) {
    e.preventDefault();
    const result = selectedSub.results?.[0];
    if (!result) { showToast('Chưa có kết quả phân tích!', 'error'); return; }
    setSavingFeedback(true);
    try {
      await api.addFeedback({ result_id: result.id, user_id: teacherId, final_score: parseFloat(overrideScore), note: feedbackNote || null });
      showToast('Đã lưu đánh giá.');
      onNotify?.(NOTIF_TYPES.TEACHER_FEEDBACK, 'Đã lưu nhận xét giáo viên', `Điểm cuối: ${overrideScore}${feedbackNote ? ' — ' + feedbackNote.slice(0, 40) : ''}`);
      setShowModal(false);
      loadData();
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
    finally { setSavingFeedback(false); }
  }

  const confColor = (c) => c >= 0.7 ? 'var(--success)' : c >= 0.4 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="animate-fade">
      {toast && createPortal(<div className={`toast toast-${toast.type}`}>{toast.message}</div>, document.body)}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">🎯 Chọn Bài tập & Lớp học</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bài tập</label>
            <select className="form-select" value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)}>
              <option value="">-- Chọn bài tập --</option>
              {assignments.map(a => <option key={a.id} value={a.id}>#{a.id} – {a.problem_text.slice(0, 50)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Lớp học</label>
            <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">-- Chọn lớp --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year})</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state"><div className="spinner spinner-lg"></div><p>Đang tải...</p></div>}

      {!loading && selectedAssignment && selectedClass && (
        <div className="card animate-slide">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="card-title" style={{ fontSize: 18 }}>
                🏫 {classes.find(c => c.id.toString() === selectedClass)?.name}
              </span>
              {rubric && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Rubric: <strong>{rubric.title}</strong> — {rubric.content?.milestones?.length || 0} milestone
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={handleAnalyzeAll} disabled={analyzingAll || students.length === 0}>
              {analyzingAll
                ? <><div className="spinner" style={{ width: 14, height: 14 }}></div>&nbsp;Đang phân tích {progress.current}/{progress.total} ({progress.name})</>
                : '🤖 Phân tích cả lớp'}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, background: 'var(--bg-base)', padding: 16, borderRadius: 'var(--radius)', marginBottom: 20, border: '1px solid var(--border)' }}>
            {[
              { label: 'Sĩ số', value: `${students.length} HS`, color: 'var(--text-primary)' },
              { label: 'Đã nộp', value: `${students.filter(s => getStudentSub(s.id)).length} bài`, color: 'var(--accent-light)' },
              { label: 'Chưa nộp', value: `${students.filter(s => !getStudentSub(s.id)).length} HS`, color: 'var(--danger)' },
              { label: 'Đã phân tích', value: `${students.filter(s => getStudentSub(s.id)?.results?.length > 0).length} bài`, color: 'var(--success)' },
              { label: 'Cần review', value: `${submissions.filter(s => s.results?.[0]?.needs_review).length} bài`, color: 'var(--warning)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {students.length === 0 ? (
            <div className="empty-state"><h3>Lớp chưa có học sinh</h3></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã số</th><th>Họ và tên</th><th>Trạng thái</th>
                  <th>Milestone đạt</th><th>Ảnh chất lượng</th><th>Review</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const sub = getStudentSub(student.id);
                  const result = sub?.results?.[0];
                  const quality = result?.image_quality_json || result?.image_quality;
                  return (
                    <tr key={student.id}>
                      <td><span className="tag">{student.student_code}</span></td>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td>
                        {sub
                          ? <span className="badge badge-info">Đã nộp</span>
                          : <span className="badge badge-danger" style={{ background: 'rgba(239,68,68,.05)', color: 'var(--text-muted)' }}>Chưa nộp</span>}
                      </td>
                      <td>
                        {result
                          ? <strong style={{ color: 'var(--accent-light)' }}>{result.total_score}/{result.total_milestones}</strong>
                          : sub ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chờ phân tích</span> : '-'}
                      </td>
                      <td>
                        {quality
                          ? <span style={{ fontSize: 12, color: confColor(quality.confidence) }}>
                              {quality.is_acceptable ? '✅' : '⚠️'} {(quality.confidence * 100).toFixed(0)}%
                            </span>
                          : '-'}
                      </td>
                      <td>
                        {result?.needs_review
                          ? <span className="badge" style={{ background: 'rgba(251,191,36,.1)', color: '#d97706' }}>⚠️ Cần xem lại</span>
                          : result ? <span className="badge badge-success" style={{ fontSize: 11 }}>OK</span> : '-'}
                      </td>
                      <td>
                        {sub ? (
                          <div className="actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAnalyze(student.id)}
                              disabled={analyzingId === student.id || analyzingAll} title="Phân tích bằng AI pipeline">
                              {analyzingId === student.id
                                ? <div className="spinner" style={{ width: 12, height: 12 }}></div>
                                : result ? '🔄 Phân tích lại' : '🤖 Phân tích AI'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => openDetails(sub)} disabled={analyzingAll}>
                              🔍 Chi tiết
                            </button>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chờ nộp</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedSub && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 960, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Kết quả phân tích lời giải</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
                {/* Image gallery */}
                <div style={{ background: 'var(--bg-base)', padding: 8, borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(selectedSub.image_urls?.length > 0 ? selectedSub.image_urls : [selectedSub.image_url]).filter(Boolean).map((url, i, arr) => (
                    <div key={i}>
                      {arr.length > 1 && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>Trang {i + 1}</div>
                      )}
                      <img src={getImageUrl(url)} alt={`Bài làm trang ${i + 1}`} style={{ width: '100%', objectFit: 'contain', borderRadius: 4 }} />
                    </div>
                  ))}
                  {selectedSub.ocr_text && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>OCR Text</div>
                      <div className="ocr-box" style={{ fontSize: 11, maxHeight: 100 }}>{selectedSub.ocr_text}</div>
                    </div>
                  )}
                </div>

                {/* Right panel */}
                {(() => {
                  const result = selectedSub.results?.[0];
                  if (!result) return (
                    <div className="empty-state">
                      <p style={{ fontStyle: 'italic' }}>Bài này chưa được phân tích. Nhấn "Phân tích AI" ngoài danh sách.</p>
                    </div>
                  );

                  const quality = result.image_quality_json || result.image_quality;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Score hero */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center', background: 'var(--accent-bg)', borderRadius: 'var(--radius)', padding: '12px 24px', border: '1px solid var(--border-strong)' }}>
                          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-light)' }}>
                            {result.total_score}<span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/{result.total_milestones}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Milestone đạt</div>
                        </div>
                        {quality && (
                          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: confColor(quality.confidence), fontWeight: 600 }}>
                              {quality.is_acceptable ? '✅' : '⚠️'} Chất lượng ảnh: {(quality.confidence * 100).toFixed(0)}%
                            </span>
                            {quality.warning && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{quality.warning}</span>}
                          </div>
                        )}
                        {result.needs_review && (
                          <span className="badge" style={{ background: 'rgba(251,191,36,.15)', color: '#d97706', fontSize: 12 }}>
                            ⚠️ Cần giáo viên xem lại
                          </span>
                        )}
                      </div>

                      {/* Tabs */}
                      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                        {[['summary', 'Tóm tắt'], ['milestones', 'Milestone'], ['steps', 'Bước giải'], ['verification', 'Kiểm chứng'], ['misconceptions', 'Lỗi suy luận']].map(([id, label]) => (
                          <button key={id} onClick={() => setActiveTab(id)}
                            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', borderBottom: activeTab === id ? '2px solid var(--accent-light)' : '2px solid transparent', background: 'none', color: activeTab === id ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Tab: Tóm tắt */}
                      {activeTab === 'summary' && (
                        <div>
                          {result.feedback_text && (
                            <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent-light)' }}>💬 Phản hồi chẩn đoán</div>
                              <MixedLatex text={result.feedback_text} />
                            </div>
                          )}
                          {result.uncertain_symbols?.length > 0 && (
                            <div style={{ marginTop: 10, padding: 10, background: 'rgba(251,191,36,.08)', borderRadius: 'var(--radius)', border: '1px solid rgba(251,191,36,.3)', fontSize: 12 }}>
                              <strong>⚠️ Ký hiệu không chắc chắn:</strong> {result.uncertain_symbols.join('; ')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab: Milestones */}
                      {activeTab === 'milestones' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(result.milestones || result.milestone_json || []).map((m, i) => (
                            <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: m.achieved ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                                <span style={{ fontSize: 16 }}>{m.achieved ? '✅' : '❌'}</span>
                                {m.name}
                              </div>
                              {m.evidence && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, paddingLeft: 24 }}>{m.evidence}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tab: Bước giải */}
                      {activeTab === 'steps' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(result.steps || result.steps_json || []).map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12 }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent-light)', minWidth: 24, paddingTop: 2 }}>#{s.step_no || i + 1}</span>
                              <div style={{ flex: 1, overflowX: 'auto' }}>
                                {s.latex
                                  ? <Latex block>{s.latex}</Latex>
                                  : s.lhs && s.rhs
                                    ? <Latex block>{`${s.lhs} = ${s.rhs}`}</Latex>
                                    : <span style={{ fontFamily: 'monospace' }}>{s.raw_text}</span>}
                                {s.raw_text && s.latex && s.raw_text !== s.latex && (
                                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>Gốc: {s.raw_text}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tab: Kiểm chứng */}
                      {activeTab === 'verification' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(result.verification || result.verification_json || []).length === 0
                            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Không có dữ liệu kiểm chứng.</div>
                            : (result.verification || result.verification_json).map((v, i) => (
                              <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: v.is_valid === true ? 'rgba(34,197,94,.06)' : v.is_valid === false ? 'rgba(239,68,68,.06)' : 'var(--bg-base)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                                  <span>{v.is_valid === true ? '✅' : v.is_valid === false ? '❌' : '❓'}</span>
                                  Bước {v.from_step} → {v.to_step}
                                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({v.method})</span>
                                </div>
                                {v.error_description && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, paddingLeft: 24 }}><MixedLatex text={v.error_description} /></div>}
                              </div>
                            ))
                          }
                        </div>
                      )}

                      {/* Tab: Lỗi suy luận */}
                      {activeTab === 'misconceptions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {(result.misconceptions || result.misconception_json || []).length === 0
                            ? <div style={{ color: 'var(--success)', fontSize: 13 }}>✅ Không phát hiện lỗi suy luận điển hình.</div>
                            : (result.misconceptions || result.misconception_json).map((m, i) => (
                              <div key={i} style={{ padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <span style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</span>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {m.step_no && <span className="tag">Bước {m.step_no}</span>}
                                    <span className="badge" style={{ fontSize: 11, background: m.confidence === 'high' ? 'rgba(239,68,68,.1)' : 'rgba(251,191,36,.1)', color: m.confidence === 'high' ? 'var(--danger)' : '#d97706' }}>
                                      {m.confidence === 'high' ? 'Cao' : m.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}><MixedLatex text={m.detail} /></div>
                              </div>
                            ))
                          }
                        </div>
                      )}

                      {/* Teacher override form */}
                      <form onSubmit={handleSaveFeedback} style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--success)' }}>✍️ Đánh giá giáo viên</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Điểm cuối</label>
                            <input type="number" className="form-input" step="0.5" min="0" max={result.total_milestones || 10}
                              value={overrideScore} onChange={e => setOverrideScore(e.target.value)} required />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Ghi chú</label>
                            <input type="text" className="form-input" placeholder="Nhận xét cho học sinh..."
                              value={feedbackNote} onChange={e => setFeedbackNote(e.target.value)} />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={savingFeedback} style={{ width: '100%', marginTop: 10 }}>
                          {savingFeedback ? 'Đang lưu...' : '💾 Lưu điểm & nhận xét'}
                        </button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Đóng</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
