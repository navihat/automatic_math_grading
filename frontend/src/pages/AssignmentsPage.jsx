import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

export default function AssignmentsPage({ teacherId }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [uploadMode, setUploadMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadAssignments(); }, [teacherId]);

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadAssignments() {
    try {
      const data = await api.getAssignments(teacherId);
      setAssignments(data);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  async function selectAssignment(a) {
    setSelectedAssignment(a);
    try {
      const r = await api.getRubricsByAssignment(a.id);
      setRubrics(r);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleSaveAssignment(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      problem_text: fd.get('problem_text'),
      deadline: new Date(fd.get('deadline')).toISOString(),
      type: fd.get('type'),
      user_id: teacherId,
    };
    try {
      if (editingAssignment) {
        await api.updateAssignment(editingAssignment.id, data);
        showToast('Đã cập nhật bài tập');
      } else {
        await api.createAssignment(data);
        showToast('Đã tạo bài tập mới');
      }
      setShowAssignmentModal(false);
      setEditingAssignment(null);
      loadAssignments();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleDeleteAssignment(id) {
    if (!confirm('Xoá bài tập này?')) return;
    try {
      await api.deleteAssignment(id);
      showToast('Đã xoá bài tập');
      if (selectedAssignment?.id === id) { setSelectedAssignment(null); setRubrics([]); }
      loadAssignments();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleUploadRubric(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('assignment_id', selectedAssignment.id);
    setUploading(true);
    try {
      await api.uploadRubric(fd);
      showToast('Rubric đã được trích xuất và lưu bởi AI');
      setShowRubricModal(false);
      setUploadMode(false);
      const r = await api.getRubricsByAssignment(selectedAssignment.id);
      setRubrics(r);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setUploading(false); }
  }

  async function handleCreateRubricManual(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const content = JSON.parse(fd.get('content'));
      await api.createRubric({
        title: fd.get('title'),
        content,
        assignment_id: selectedAssignment.id,
      });
      showToast('Đã tạo rubric');
      setShowRubricModal(false);
      const r = await api.getRubricsByAssignment(selectedAssignment.id);
      setRubrics(r);
    } catch (err) {
      if (err instanceof SyntaxError) showToast('JSON không hợp lệ', 'error');
      else showToast(err.message, 'error');
    }
  }

  async function handleDeleteRubric(id) {
    if (!confirm('Xoá rubric này?')) return;
    try {
      await api.deleteRubric(id);
      showToast('Đã xoá rubric');
      const r = await api.getRubricsByAssignment(selectedAssignment.id);
      setRubrics(r);
    } catch (err) { showToast(err.message, 'error'); }
  }

  if (loading) return <div className="loading-state"><div className="spinner spinner-lg"></div><span>Đang tải...</span></div>;

  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="animate-fade">
      {toast && createPortal(
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
        document.body
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedAssignment ? '1fr 1.5fr' : '1fr', gap: 24 }}>
        {/* Assignments List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📝 Bài tập</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingAssignment(null); setShowAssignmentModal(true); }}>
              + Tạo bài tập
            </button>
          </div>
          {assignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>Chưa có bài tập</h3>
              <p>Tạo bài tập đầu tiên</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Đề bài</th>
                  <th>Loại</th>
                  <th>Hạn</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => selectAssignment(a)}
                    style={{ cursor: 'pointer', background: selectedAssignment?.id === a.id ? 'var(--accent-bg)' : undefined }}
                  >
                    <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.problem_text}
                    </td>
                    <td><span className="badge badge-violet">{a.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(a.deadline).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm btn-icon" title="Sửa" onClick={(e) => { e.stopPropagation(); setEditingAssignment(a); setShowAssignmentModal(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Xoá" onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(a.id); }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rubric Panel */}
        {selectedAssignment && (
          <div className="card animate-slide">
            <div className="card-header">
              <span className="card-title">📐 Rubric – Bài tập #{selectedAssignment.id}</span>
              <button className="btn btn-primary btn-sm" onClick={() => { setUploadMode(false); setShowRubricModal(true); }}>
                + Thêm rubric
              </button>
            </div>

            <div style={{ padding: '0 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Đề bài:</strong> {selectedAssignment.problem_text}
              </p>
            </div>

            {rubrics.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📐</div>
                <h3>Chưa có rubric</h3>
                <p>Upload file hoặc tạo rubric thủ công</p>
              </div>
            ) : (
              rubrics.map((r) => (
                <div key={r.id} className="criterion-card" style={{ marginBottom: 12 }}>
                  <div className="criterion-header">
                    <span className="criterion-name">📋 {r.title}</span>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteRubric(r.id)}>🗑️</button>
                  </div>
                  {r.content?.criteria && (
                    <div style={{ marginTop: 8 }}>
                      {r.content.criteria.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                          <span style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                          <span className="badge badge-success">{c.max_score} đ</span>
                        </div>
                      ))}
                      {r.content.total_score && (
                        <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, color: 'var(--accent-light)' }}>
                          Tổng: {r.content.total_score} điểm
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAssignment ? 'Sửa bài tập' : 'Tạo bài tập mới'}</h3>
              <button className="modal-close" onClick={() => setShowAssignmentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Đề bài / Mô tả</label>
                  <textarea className="form-textarea" name="problem_text" rows="3" defaultValue={editingAssignment?.problem_text || ''} placeholder="Nhập nội dung đề bài..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">Loại bài</label>
                  <select className="form-select" name="type" defaultValue={editingAssignment?.type || 'math'}>
                    <option value="math">Toán học</option>
                    <option value="algebra">Đại số</option>
                    <option value="geometry">Hình học</option>
                    <option value="calculus">Giải tích</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hạn nộp</label>
                  <input className="form-input" name="deadline" type="datetime-local" defaultValue={editingAssignment ? new Date(editingAssignment.deadline).toISOString().slice(0, 16) : defaultDeadline()} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignmentModal(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">{editingAssignment ? 'Cập nhật' : 'Tạo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rubric Modal */}
      {showRubricModal && (
        <div className="modal-overlay" onClick={() => setShowRubricModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm Rubric</h3>
              <button className="modal-close" onClick={() => setShowRubricModal(false)}>✕</button>
            </div>

            <div style={{ padding: '12px 24px 0' }}>
              <div className="tabs">
                <button className={`tab ${!uploadMode ? 'active' : ''}`} onClick={() => setUploadMode(false)}>📤 Upload file</button>
                <button className={`tab ${uploadMode ? 'active' : ''}`} onClick={() => setUploadMode(true)}>✍️ Nhập thủ công</button>
              </div>
            </div>

            {!uploadMode ? (
              <form onSubmit={handleUploadRubric}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Tiêu đề rubric</label>
                    <input className="form-input" name="title" placeholder="Ví dụ: Rubric Kiểm tra giữa kỳ" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">File rubric (PDF / Ảnh)</label>
                    <div className="file-upload">
                      <input type="file" name="file" accept=".pdf,image/jpeg,image/png,image/gif,image/webp" required />
                      <div className="file-upload-icon">📎</div>
                      <div className="file-upload-text">
                        Kéo thả hoặc <strong>chọn file</strong>
                        <br />PDF, JPEG, PNG, GIF, WebP (max 10MB)
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRubricModal(false)}>Huỷ</button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? <><div className="spinner" style={{ width: 14, height: 14 }}></div> AI đang trích xuất...</> : '🤖 Upload & Trích xuất'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateRubricManual}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Tiêu đề</label>
                    <input className="form-input" name="title" placeholder="Tên rubric" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nội dung (JSON)</label>
                    <textarea className="form-textarea" name="content" rows="8" placeholder={`{\n  "criteria": [\n    {"name": "Bước 1", "description": "...", "max_score": 3}\n  ],\n  "total_score": 10\n}`} required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRubricModal(false)}>Huỷ</button>
                  <button type="submit" className="btn btn-primary">Lưu rubric</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
