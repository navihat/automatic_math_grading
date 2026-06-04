import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';

export default function GradingPage() {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  // Data lists
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [rubric, setRubric] = useState(null);
  
  // Loading & Progress states
  const [loading, setLoading] = useState(false);
  const [gradingStudentId, setGradingStudentId] = useState(null);
  const [gradingAll, setGradingAll] = useState(false);
  const [gradingProgress, setGradingProgress] = useState({ current: 0, total: 0, currentName: '' });
  
  // Modal states
  const [selectedSub, setSelectedSub] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [overrideScore, setOverrideScore] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Load initial listings
    Promise.all([api.getAssignments(), api.getClasses()])
      .then(([asmList, clsList]) => {
        setAssignments(asmList);
        setClasses(clsList);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedAssignment && selectedClass) {
      loadData();
    } else {
      setStudents([]);
      setSubmissions([]);
      setRubric(null);
    }
  }, [selectedAssignment, selectedClass]);

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadData() {
    setLoading(true);
    try {
      // 1. Get rubric for this assignment
      const rubricsList = await api.getRubricsByAssignment(selectedAssignment);
      let rub = null;
      let subsList = [];
      if (rubricsList && rubricsList.length > 0) {
        rub = rubricsList[0];
        setRubric(rub);
        // 2. Get submissions for this rubric
        subsList = await api.getSubmissionsByRubric(rub.id);
      } else {
        setRubric(null);
        showToast('Bài tập này chưa có Rubric chấm điểm!', 'error');
      }

      // 3. Get students in this class
      const studsList = await api.getStudents(selectedClass);
      
      setStudents(studsList);
      setSubmissions(subsList);
    } catch (err) {
      showToast('Lỗi khi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Get student's latest submission
  function getStudentSubmission(studentId) {
    if (!rubric) return null;
    const filtered = submissions.filter(s => s.student_id === studentId);
    if (filtered.length === 0) return null;
    // Sort by submitted_at desc
    return filtered.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
  }

  // Grade an individual student's submission using the regrade endpoint
  async function handleGradeIndividual(studentId) {
    const sub = getStudentSubmission(studentId);
    if (!sub) {
      showToast('Học sinh này chưa nộp bài làm.', 'error');
      return;
    }
    
    setGradingStudentId(studentId);
    try {
      showToast('Đang chấm điểm bài làm bằng AI...');
      const res = await api.regradeSubmission(sub.id);
      
      // Update submissions state list with the updated submission details
      const updatedSub = {
        ...sub,
        ocr_text: res.submission.ocr_text,
        results: [res.result]
      };
      setSubmissions(prev => prev.map(s => s.id === sub.id ? updatedSub : s));
      showToast(`Đã chấm xong bài cho học sinh! Điểm AI: ${res.result.total_score}đ`);
    } catch (err) {
      showToast('Chấm điểm thất bại: ' + err.message, 'error');
    } finally {
      setGradingStudentId(null);
    }
  }

  // Grade all submissions in the class sequentially
  async function handleGradeAll() {
    // Find all students who have submissions
    const studentsWithSubs = students.map(student => {
      const sub = getStudentSubmission(student.id);
      return { student, sub };
    }).filter(item => item.sub !== null);

    if (studentsWithSubs.length === 0) {
      showToast('Lớp học này chưa có học sinh nào nộp bài!', 'error');
      return;
    }

    setGradingAll(true);
    setGradingProgress({ current: 0, total: studentsWithSubs.length, currentName: '' });

    let successCount = 0;
    for (let i = 0; i < studentsWithSubs.length; i++) {
      const { student, sub } = studentsWithSubs[i];
      setGradingProgress(prev => ({ ...prev, current: i + 1, currentName: student.name }));
      
      try {
        const res = await api.regradeSubmission(sub.id);
        const updatedSub = {
          ...sub,
          ocr_text: res.submission.ocr_text,
          results: [res.result]
        };
        // Update list live
        setSubmissions(prev => prev.map(s => s.id === sub.id ? updatedSub : s));
        successCount++;
      } catch (err) {
        console.error(`Lỗi khi chấm bài cho ${student.name}:`, err);
      }
    }

    setGradingAll(false);
    showToast(`Đã hoàn tất chấm điểm cả lớp! Chấm thành công ${successCount}/${studentsWithSubs.length} bài.`);
  }

  // Open detail view for teacher review
  function handleOpenDetails(sub) {
    setSelectedSub(sub);
    const result = sub.results?.[0];
    setOverrideScore(result ? result.teacher_feedback?.final_score ?? result.total_score : '');
    setFeedbackNote(result ? result.teacher_feedback?.note ?? '' : '');
    setShowModal(true);
  }

  // Save teacher feedback override
  async function handleSaveFeedback(e) {
    e.preventDefault();
    const result = selectedSub.results?.[0];
    if (!result) {
      showToast('Bài nộp này chưa được chấm điểm AI!', 'error');
      return;
    }

    setSavingFeedback(true);
    const data = {
      result_id: result.id,
      user_id: 1, // Default teacher ID
      final_score: parseFloat(overrideScore),
      note: feedbackNote || null
    };

    try {
      await api.addFeedback(data);
      showToast('Đã lưu đánh giá của giáo viên.');
      setShowModal(false);
      
      // Reload submissions to reflect feedback changes
      loadData();
    } catch (err) {
      showToast('Lỗi lưu đánh giá: ' + err.message, 'error');
    } finally {
      setSavingFeedback(false);
    }
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

      {/* Filter Selection Panel */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">🎯 Chọn Bài tập & Lớp học để chấm điểm</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bài tập</label>
            <select className="form-select" value={selectedAssignment} onChange={(e) => { setSelectedAssignment(e.target.value); }}>
              <option value="">-- Chọn bài tập --</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>#{a.id} – {a.problem_text.slice(0, 50)}...</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Lớp học</label>
            <select className="form-select" value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); }}>
              <option value="">-- Chọn lớp học --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-state">
          <div className="spinner spinner-lg"></div>
          <p>Đang tải danh sách học sinh và bài nộp...</p>
        </div>
      )}

      {/* Main dashboard view */}
      {!loading && selectedAssignment && selectedClass && (
        <div className="card animate-slide">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="card-title" style={{ fontSize: 18 }}>
                🏫 Bảng điểm Lớp {classes.find(c => c.id.toString() === selectedClass)?.name}
              </span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Bài tập: <strong>{assignments.find(a => a.id.toString() === selectedAssignment)?.problem_text.slice(0, 70)}...</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleGradeAll}
                disabled={gradingAll || students.length === 0}
              >
                {gradingAll ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14 }}></div>
                    Đang chấm {gradingProgress.current}/{gradingProgress.total} ({gradingProgress.currentName})
                  </>
                ) : (
                  '🤖 Chấm điểm cả lớp'
                )}
              </button>
            </div>
          </div>

          {/* Metrics summary banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
              background: 'var(--bg-base)',
              padding: 16,
              borderRadius: 'var(--radius)',
              marginBottom: 20,
              border: '1px solid var(--border)'
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sĩ số lớp</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{students.length} HS</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Đã nộp bài</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-light)' }}>
                {students.filter(s => getStudentSubmission(s.id) !== null).length} bài
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chưa nộp</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
                {students.filter(s => getStudentSubmission(s.id) === null).length} HS
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Đã chấm xong</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>
                {students.filter(s => {
                  const sub = getStudentSubmission(s.id);
                  return sub && sub.results && sub.results.length > 0;
                }).length} bài
              </div>
            </div>
          </div>

          {/* Student list table */}
          {students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🎓</div>
              <h3>Không có học sinh</h3>
              <p>Lớp học này hiện tại chưa có học sinh nào.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã số HS</th>
                  <th>Họ và tên</th>
                  <th>Trạng thái nộp</th>
                  <th>Điểm AI</th>
                  <th>Điểm GV</th>
                  <th>Thời gian nộp</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const sub = getStudentSubmission(student.id);
                  const result = sub?.results?.[0];
                  const feedback = result?.teacher_feedback;
                  
                  return (
                    <tr key={student.id}>
                      <td><span className="tag">{student.student_code}</span></td>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td>
                        {sub ? (
                          <span className="badge badge-info">Đã nộp</span>
                        ) : (
                          <span className="badge badge-danger" style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--text-muted)' }}>Chưa nộp</span>
                        )}
                      </td>
                      <td>
                        {result ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ color: 'var(--accent-light)', fontSize: 14 }}>
                              {result.total_score}đ
                            </strong>
                            <span
                              style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: confidenceColor(result.confidence) + '22',
                                color: confidenceColor(result.confidence),
                                fontWeight: 600
                              }}
                            >
                              {(result.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : sub ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chờ chấm</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {feedback ? (
                          <strong style={{ color: 'var(--success)', fontSize: 14 }}>
                            {feedback.final_score}đ
                          </strong>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {sub ? new Date(sub.submitted_at).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td>
                        {sub ? (
                          <div className="actions">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleGradeIndividual(student.id)}
                              disabled={gradingStudentId === student.id || gradingAll}
                              title="Chấm điểm bằng AI"
                            >
                              {gradingStudentId === student.id ? (
                                <div className="spinner" style={{ width: 12, height: 12 }}></div>
                              ) : result ? (
                                '🔄 Chấm lại'
                              ) : (
                                '🤖 Chấm AI'
                              )}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDetails(sub)}
                              disabled={gradingAll}
                            >
                              🔍 Chi tiết
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chờ nộp bài</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detail Review & Override Modal */}
      {showModal && selectedSub && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '900px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Chi tiết bài làm học sinh</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="grading-split" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left panel: Submission image */}
                <div className="grading-image-panel" style={{ background: 'var(--bg-base)', padding: 8, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <img
                    src={getImageUrl(selectedSub.image_url)}
                    alt="Bài làm viết tay"
                    style={{ width: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                {/* Right panel: AI Grading Results & Override Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedSub.results && selectedSub.results.length > 0 ? (
                    (() => {
                      const res = selectedSub.results[0];
                      return (
                        <>
                          {/* AI Score Hero */}
                          <div className="score-hero" style={{ padding: 16 }}>
                            <div className="score-value">
                              {res.total_score}
                              <span className="score-max">/{rubric?.content?.total_score || 10}</span>
                            </div>
                            <div className="confidence-bar">
                              <span className="confidence-label">Độ tin cậy: {(res.confidence * 100).toFixed(0)}%</span>
                              <div className="confidence-track">
                                <div
                                  className="confidence-fill"
                                  style={{
                                    width: `${res.confidence * 100}%`,
                                    background: confidenceColor(res.confidence)
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Steps scores details */}
                          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {res.steps_json?.criteria_scores?.map((cs, idx) => (
                              <div key={idx} className="criterion-card" style={{ padding: 10 }}>
                                <div className="criterion-header" style={{ marginBottom: 4 }}>
                                  <span className="criterion-name" style={{ fontSize: 13, fontWeight: 600 }}>{cs.criterion_name}</span>
                                  <span className="criterion-score" style={{ fontSize: 13 }}>{cs.awarded_score}/{cs.max_score}</span>
                                </div>
                                <div className="criterion-reasoning" style={{ fontSize: 11.5 }}>{cs.reasoning}</div>
                              </div>
                            ))}
                          </div>

                          {res.steps_json?.overall_feedback && (
                            <div className="criterion-card" style={{ padding: 10, borderColor: 'var(--border-strong)' }}>
                              <div className="criterion-name" style={{ fontSize: 13, marginBottom: 4 }}>💡 Nhận xét AI:</div>
                              <div className="criterion-reasoning" style={{ fontSize: 11.5 }}>{res.steps_json.overall_feedback}</div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="loading-state" style={{ padding: 20 }}>
                      <p style={{ fontStyle: 'italic' }}>Bài nộp này chưa được chấm điểm bằng AI. Hãy nhấn "Chấm AI" ngoài danh sách.</p>
                    </div>
                  )}

                  {/* OCR extracted text */}
                  {selectedSub.ocr_text && (
                    <div>
                      <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>📝 Văn bản trích xuất (OCR)</label>
                      <div className="ocr-box" style={{ maxHeight: '100px', fontSize: 11.5 }}>{selectedSub.ocr_text}</div>
                    </div>
                  )}

                  {/* Teacher Feedback / Override Form */}
                  {selectedSub.results && selectedSub.results.length > 0 && (
                    <form onSubmit={handleSaveFeedback} style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--success)' }}>✍️ Giáo viên chấm điểm & Nhận xét</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label className="form-label" style={{ fontSize: 11 }}>Điểm số</label>
                          <input
                            type="number"
                            className="form-input"
                            step="0.5"
                            min="0"
                            max={rubric?.content?.total_score || 10}
                            value={overrideScore}
                            onChange={(e) => setOverrideScore(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label className="form-label" style={{ fontSize: 11 }}>Ghi chú học sinh</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Khen ngợi hoặc nhắc nhở học sinh..."
                            value={feedbackNote}
                            onChange={(e) => setFeedbackNote(e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={savingFeedback}
                        style={{ width: '100%', marginTop: 8 }}
                      >
                        {savingFeedback ? 'Đang lưu...' : '💾 Lưu điểm & Nhận xét'}
                      </button>
                    </form>
                  )}
                </div>
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
