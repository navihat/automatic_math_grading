import { useState, useEffect } from 'react';
import { api, getImageUrl } from '../api';

export default function GradingPage() {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [rubrics, setRubrics] = useState([]);
  const [selectedRubric, setSelectedRubric] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([api.getAssignments(), api.getClasses()])
      .then(([a, c]) => { setAssignments(a); setClasses(c); })
      .catch(() => {});
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAssignmentChange(e) {
    const id = e.target.value;
    setSelectedAssignment(id);
    setSelectedRubric('');
    setRubrics([]);
    if (id) {
      try {
        const r = await api.getRubricsByAssignment(id);
        setRubrics(r);
        if (r.length === 1) setSelectedRubric(r[0].id.toString());
      } catch { /* ignore */ }
    }
  }

  async function handleClassChange(e) {
    const id = e.target.value;
    setSelectedClass(id);
    setSelectedStudent('');
    setStudents([]);
    if (id) {
      try {
        const s = await api.getStudents(id);
        setStudents(s);
      } catch { /* ignore */ }
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
    }
  }

  async function handleGrade() {
    if (!file || !selectedRubric || !selectedStudent) {
      showToast('Vui lòng chọn đầy đủ thông tin', 'error');
      return;
    }
    setGrading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('student_id', selectedStudent);
      fd.append('rubric_id', selectedRubric);
      const res = await api.gradeSubmission(fd);
      setResult(res);
      showToast('Chấm điểm hoàn tất!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setGrading(false);
    }
  }

  const confidenceColor = (c) => {
    if (c >= 0.8) return 'var(--success)';
    if (c >= 0.5) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="animate-fade">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Selection Form */}
      {!result && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">🎯 Thông tin chấm điểm</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Bài tập</label>
              <select className="form-select" value={selectedAssignment} onChange={handleAssignmentChange}>
                <option value="">-- Chọn bài tập --</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>#{a.id} – {a.problem_text.slice(0, 40)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Rubric chấm điểm</label>
              <select className="form-select" value={selectedRubric} onChange={(e) => setSelectedRubric(e.target.value)} disabled={rubrics.length === 0}>
                <option value="">-- Chọn rubric --</option>
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Lớp</label>
              <select className="form-select" value={selectedClass} onChange={handleClassChange}>
                <option value="">-- Chọn lớp --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Học sinh</label>
              <select className="form-select" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={students.length === 0}>
                <option value="">-- Chọn học sinh --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.student_code} – {s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* File Upload & Grade */}
      {!result && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">📤 Upload bài làm</span>
          </div>

          {!preview ? (
            <div className="file-upload">
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} />
              <div className="file-upload-icon">📷</div>
              <div className="file-upload-text">
                Kéo thả hoặc <strong>chọn ảnh</strong> bài làm viết tay
                <br />JPEG, PNG, GIF, WebP (max 10MB)
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <img src={preview} alt="Preview" style={{ maxHeight: 300, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => { setFile(null); setPreview(null); }}>
                  🔄 Đổi ảnh
                </button>
                <button className="btn btn-primary" onClick={handleGrade} disabled={grading || !selectedRubric || !selectedStudent}>
                  {grading ? (
                    <><div className="spinner" style={{ width: 14, height: 14 }}></div> AI đang chấm điểm...</>
                  ) : (
                    '🤖 Chấm điểm bằng AI'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grading Loading State */}
      {grading && (
        <div className="loading-state">
          <div className="spinner spinner-lg"></div>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ fontSize: 16 }}>AI đang phân tích bài làm...</strong>
            <p style={{ fontSize: 13, marginTop: 4 }}>Trích xuất chữ viết tay → Đối chiếu rubric → Tính điểm</p>
          </div>
        </div>
      )}

      {/* Grading Result */}
      {result && (
        <div>
          <div className="action-bar" style={{ marginBottom: 20 }}>
            <button className="btn btn-secondary" onClick={() => { setResult(null); setFile(null); setPreview(null); }}>
              ← Chấm bài khác
            </button>
          </div>

          <div className="grading-split">
            {/* Left: Image */}
            <div className="grading-image-panel">
              <img
                src={result.submission?.image_url ? getImageUrl(result.submission.image_url) : preview}
                alt="Bài làm"
              />
            </div>

            {/* Right: Results */}
            <div className="grading-detail-panel">
              {/* Score Hero */}
              <div className="score-hero">
                <div className="score-value">
                  {result.result.total_score}
                  <span className="score-max">
                    /{rubrics.find(r => r.id.toString() === selectedRubric)?.content?.total_score || '?'}
                  </span>
                </div>
                <div className="confidence-bar">
                  <span className="confidence-label">Độ tin cậy:</span>
                  <div className="confidence-track">
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${(result.result.confidence * 100).toFixed(0)}%`,
                        background: confidenceColor(result.result.confidence),
                      }}
                    />
                  </div>
                  <span className="confidence-label" style={{ color: confidenceColor(result.result.confidence), fontWeight: 600 }}>
                    {(result.result.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Criteria Scores */}
              {result.result.steps_json?.criteria_scores?.map((cs, i) => (
                <div key={i} className="criterion-card">
                  <div className="criterion-header">
                    <span className="criterion-name">{cs.criterion_name}</span>
                    <span className="criterion-score">{cs.awarded_score}/{cs.max_score}</span>
                  </div>
                  <div className="criterion-reasoning">{cs.reasoning}</div>
                </div>
              ))}

              {/* Overall Feedback */}
              {result.result.steps_json?.overall_feedback && (
                <div className="criterion-card" style={{ borderColor: 'var(--border-strong)' }}>
                  <div className="criterion-name" style={{ marginBottom: 8 }}>💡 Nhận xét tổng thể</div>
                  <div className="criterion-reasoning">{result.result.steps_json.overall_feedback}</div>
                </div>
              )}

              {/* OCR Text */}
              {result.submission?.ocr_text && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    📝 Nội dung trích xuất (OCR)
                  </div>
                  <div className="ocr-box">{result.submission.ocr_text}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
