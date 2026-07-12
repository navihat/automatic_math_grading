import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';

export default function StudentDashboard({ student, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [rubrics, setRubrics] = useState({});
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' or 'history'
  const [activeSemester, setActiveSemester] = useState(1);
  
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
    <div className="app-layout">
      {toast && createPortal(
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
        document.body
      )}

      {/* Student Sidebar (Navy Theme matching the image) */}
      <aside className="sidebar open">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon" style={{ background: 'none', boxShadow: 'none' }}>
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 5L15 25V60C15 76.5 50 95 50 95C50 95 85 76.5 85 60V25L50 5Z" fill="url(#studentCrest)" stroke="#ffffff" strokeWidth="4"/>
                <path d="M50 25V75M25 50H75" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"/>
                <circle cx="50" cy="50" r="10" fill="#ffb03a" />
                <defs>
                  <linearGradient id="studentCrest" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0c647b"/>
                    <stop offset="1" stopColor="#051b3d"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1>Học sinh Portal</h1>
              <div className="subtitle">Math Grading AI</div>
            </div>
          </div>

          {/* User Profile Card right below logo */}
          <div className="sidebar-user-card" style={{ marginTop: 20 }}>
            <div className="sidebar-user-avatar fallback">
              {student.name.split(' ').pop().slice(0, 2).toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">Hi, {student.name.split(' ').pop()}</div>
              <div className="sidebar-user-code">{student.username}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('assignments'); setGradingResult(null); setSelectedAssignment(null); }}
          >
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V3c0-1.1.9-2 2-2h14v21H6.5c-1.1 0-2.5-.9-2.5-2.5z"/></svg></span>
            My Courses
          </div>
          <div
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setGradingResult(null); setSelectedAssignment(null); }}
          >
            <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg></span>
            Lịch sử nộp bài
          </div>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onLogout} 
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              background: 'transparent', 
              borderColor: 'var(--sidebar-border)', 
              color: 'var(--sidebar-text-muted)' 
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Student Main Content */}
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-title">
            <h2>{activeTab === 'assignments' ? 'My Courses' : 'Lịch sử nộp bài của bạn'}</h2>
            <p>Học sinh: <strong>{student.name}</strong> • Lớp: <strong>Lớp {student.class_id}</strong></p>
          </div>
          <div className="page-header-actions">
            <button className="header-icon-btn" title="Thông báo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="badge-dot"></span>
            </button>
            <button className="header-icon-btn" title="Tin nhắn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        </div>

        <div className="page-body">
          {activeTab === 'assignments' && (
            <>
              {/* Course Cards Grid */}
              <div className="course-grid animate-fade">
                <div className="course-card">
                  <div className="course-card-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <div className="course-card-details">
                    <h3 className="course-card-title">Diploma in English</h3>
                    <p className="course-card-subtitle">OXF/ENG/01</p>
                  </div>
                </div>
                <div className="course-card">
                  <div className="course-card-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <div className="course-card-details">
                    <h3 className="course-card-title">Diploma in IT</h3>
                    <p className="course-card-subtitle">OXF/DIT/01</p>
                  </div>
                </div>
                <div className="course-card">
                  <div className="course-card-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <div className="course-card-details">
                    <h3 className="course-card-title">HND in Computing</h3>
                    <p className="course-card-subtitle">OXF/HND/01</p>
                  </div>
                </div>
              </div>

              {/* Semester Tabs Navigation Capsule */}
              <div className="semester-bar animate-fade">
                <button className={`semester-tab ${activeSemester === 1 ? 'active' : ''}`} onClick={() => { setActiveSemester(1); setSelectedAssignment(null); }}>Semester 01</button>
                <button className={`semester-tab ${activeSemester === 2 ? 'active' : ''}`} onClick={() => { setActiveSemester(2); setSelectedAssignment(null); }}>Semester 02</button>
                <button className={`semester-tab ${activeSemester === 3 ? 'active' : ''}`} onClick={() => { setActiveSemester(3); setSelectedAssignment(null); }}>Semester 03</button>
                <button className={`semester-tab ${activeSemester === 4 ? 'active' : ''}`} onClick={() => { setActiveSemester(4); setSelectedAssignment(null); }}>Semester 04</button>
              </div>

              {activeSemester !== 1 ? (
                <div className="card empty-state animate-slide">
                  <h3 style={{ marginTop: 12 }}>Kỳ học chưa diễn ra</h3>
                  <p>Không tìm thấy bài học hoặc bài tập nào trong Kỳ 0{activeSemester}.</p>
                </div>
              ) : assignments.length === 0 ? (
                <div className="card empty-state animate-slide">
                  <h3 style={{ marginTop: 12 }}>Chưa có bài tập nào được giao</h3>
                  <p>Giáo viên chưa giao bài tập nào cho lớp của bạn trong học kỳ này.</p>
                </div>
              ) : (
                <div className="grading-split animate-slide" style={{ gridTemplateColumns: selectedAssignment ? '1.2fr 1fr' : '1fr', transition: 'grid-template-columns 0.3s ease' }}>
                  
                  {/* Left Column: Modules list as a clean table card */}
                  <div className="card" style={{ height: 'fit-content' }}>
                    <div className="card-header">
                      <span className="card-title">Danh sách học phần & Bài tập (Semester 01)</span>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>Nộp</th>
                            <th>Mã môn</th>
                            <th>Tên môn</th>
                            <th>Loại</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((asm, idx) => {
                            const latestSub = getLatestSubmission(asm.id);
                            const expired = isExpired(asm.deadline);
                            const isSelected = selectedAssignment?.id === asm.id;
                            
                            let statusText = 'Pending';
                            let statusClass = 'badge-warning';
                            if (latestSub) {
                              statusText = 'Completed';
                              statusClass = 'badge-success';
                            } else if (!expired) {
                              statusText = 'Ongoing';
                              statusClass = 'badge-info';
                            } else {
                              statusText = 'Pending';
                              statusClass = 'badge-danger';
                            }

                            const mathSubjects = [
                              'Programming Concepts',
                              'Networking Principles',
                              'Database Management',
                              'Professional Practice',
                              'Discrete Mathematics',
                              'Linear Algebra'
                            ];
                            const subjectName = mathSubjects[idx % mathSubjects.length];

                            return (
                              <tr 
                                key={asm.id}
                                onClick={() => {
                                  setSelectedAssignment(asm);
                                  setFile(null);
                                  setPreview(null);
                                  setGradingResult(null);
                                }}
                                style={{ 
                                  cursor: 'pointer',
                                  background: isSelected ? 'var(--bg-hover)' : 'transparent',
                                  fontWeight: isSelected ? 600 : 'normal'
                                }}
                              >
                                <td>
                                  <div className={`custom-checkbox ${latestSub ? 'checked' : ''}`}></div>
                                </td>
                                <td><strong>Module 0{idx + 1}</strong></td>
                                <td>{subjectName}</td>
                                <td><span className="tag">{asm.type.toUpperCase()}</span></td>
                                <td>
                                  <span className={`badge ${statusClass}`}>{statusText}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: AI Grading / Upload Panel */}
                  {selectedAssignment && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-slide">
                      <div className="card">
                        <div className="card-header">
                          <span className="card-title">Đề bài Module 0{assignments.indexOf(selectedAssignment) + 1}</span>
                          <button className="modal-close" onClick={() => setSelectedAssignment(null)}>✕</button>
                        </div>
                        
                        <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                            Yêu cầu:
                          </div>
                          <div style={{ fontSize: 14.5, whiteSpace: 'pre-wrap', color: 'var(--color-navy)' }}>{selectedAssignment.problem_text}</div>
                        </div>

                        {rubrics[selectedAssignment.id] && (
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Rubric chấm điểm: <strong>{rubrics[selectedAssignment.id].title}</strong> (Tổng điểm: {rubrics[selectedAssignment.id].content?.total_score ?? 10})
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                          Hạn nộp: {new Date(selectedAssignment.deadline).toLocaleString('vi-VN')}
                        </div>
                      </div>

                      {/* Submission status or Form */}
                      {(() => {
                        const latestSub = getLatestSubmission(selectedAssignment.id);
                        const expired = isExpired(selectedAssignment.deadline);

                        if (gradingResult) {
                          return (
                            <div className="card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ color: 'var(--success)', fontSize: 15 }}>AI Đã Chấm Điểm Xong!</h3>
                                <button className="btn btn-secondary btn-sm" onClick={() => setGradingResult(null)}>
                                  Quay lại bài nộp trước
                                </button>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="grading-image-panel">
                                  <img src={getImageUrl(gradingResult.submission.image_url)} alt="Bài làm học sinh" />
                                </div>
                                <div className="grading-detail-panel">
                                  <div className="score-hero">
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
                                    <div key={i} className="criterion-card">
                                      <div className="criterion-header">
                                        <span className="criterion-name">{cs.criterion_name}</span>
                                        <span className="criterion-score">{cs.awarded_score}/{cs.max_score} đ</span>
                                      </div>
                                      <div className="criterion-reasoning">{cs.reasoning}</div>
                                    </div>
                                  ))}

                                  {gradingResult.result.steps_json?.overall_feedback && (
                                    <div className="criterion-card" style={{ borderColor: 'var(--border-strong)' }}>
                                      <div className="criterion-name" style={{ marginBottom: 6 }}>Nhận xét của AI:</div>
                                      <div className="criterion-reasoning">{gradingResult.result.steps_json.overall_feedback}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (latestSub) {
                          const result = latestSub.results?.[0];
                          return (
                            <div className="card">
                              <div className="card-header">
                                <span className="card-title">Bài làm đã nộp (Lúc {new Date(latestSub.submitted_at).toLocaleDateString('vi-VN')})</span>
                                {!expired && (
                                  <span className="badge badge-success">Vẫn có thể nộp lại</span>
                                )}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="grading-image-panel" style={{ minHeight: 200 }}>
                                  <img src={getImageUrl(latestSub.image_url)} alt="Bài làm" />
                                </div>

                                <div className="grading-detail-panel">
                                  {result ? (
                                    <>
                                      <div className="score-hero">
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
                                        <div key={idx} className="criterion-card">
                                          <div className="criterion-header">
                                            <span className="criterion-name">{cs.criterion_name}</span>
                                            <span className="criterion-score">{cs.awarded_score}/{cs.max_score} đ</span>
                                          </div>
                                          <div className="criterion-reasoning">{cs.reasoning}</div>
                                        </div>
                                      ))}

                                      {result.steps_json?.overall_feedback && (
                                        <div className="criterion-card" style={{ borderColor: 'var(--border-strong)' }}>
                                          <div className="criterion-name" style={{ marginBottom: 6 }}>Nhận xét AI:</div>
                                          <div className="criterion-reasoning">{result.steps_json.overall_feedback}</div>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="loading-state">
                                      <div className="spinner"></div>
                                      <p>Đang chờ chấm điểm hoặc xử lý AI...</p>
                                    </div>
                                  )}

                                  {!expired && (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 12 }}>
                                      <div className="form-group" style={{ marginBottom: 12 }}>
                                        <label className="form-label" style={{ fontSize: 11 }}>Chọn ảnh bài làm mới để nộp lại:</label>
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

                        if (expired) {
                          return (
                            <div className="card" style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
                              <h3 style={{ marginTop: 12 }}>Đã hết hạn nộp bài</h3>
                              <p style={{ fontSize: 13 }}>Bài tập này đã quá hạn nộp và bạn chưa nộp bài.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="card">
                            <div className="card-header">
                              <span className="card-title">Tiến hành nộp bài</span>
                            </div>

                            {!preview ? (
                              <div className="file-upload">
                                <input type="file" accept="image/*" onChange={handleFileChange} />
                                <div className="file-upload-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-teal)' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                </div>
                                <div className="file-upload-text">
                                  Nhấp chọn hoặc <strong>kéo thả ảnh</strong> chụp bài làm viết tay của bạn
                                </div>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center' }}>
                                <img src={preview} alt="Xem trước bài nộp" style={{ maxHeight: 220, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }} />
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => { setFile(null); setPreview(null); }} disabled={uploading}>
                                    Chọn ảnh khác
                                  </button>
                                  <button className="btn btn-primary btn-sm" onClick={handleUploadSubmit} disabled={uploading}>
                                    {uploading ? 'Đang chấm...' : 'Nộp bài'}
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
              )}
            </>
          )}

          {activeTab === 'history' && (
            submissions.length === 0 ? (
              <div className="card empty-state">
                <h3 style={{ marginTop: 12 }}>Lịch sử bài nộp trống</h3>
                <p>Bạn chưa nộp bất kỳ bài làm nào trên hệ thống.</p>
              </div>
            ) : (
              <div className="card animate-slide">
                <div className="card-header">
                  <span className="card-title">Lịch sử bài nộp</span>
                </div>
                <div className="table-container">
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
                              <strong style={{ color: 'var(--color-teal)', fontSize: 14 }}>
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
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
