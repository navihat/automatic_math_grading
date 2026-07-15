import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, getImageUrl } from '../api';

import { NOTIF_TYPES } from '../hooks/useNotifications';

export default function AssignmentsPage({ teacherId, onNotify }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [linkedClasses, setLinkedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [uploadMode, setUploadMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [generatingMilestones, setGeneratingMilestones] = useState(false);
  const [rubricTitle, setRubricTitle] = useState('');
  const [togglingClass, setTogglingClass] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  useEffect(() => { loadAssignments(); loadAllClasses(); }, [teacherId]);

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

  async function loadAllClasses() {
    try {
      const data = await api.getClasses(teacherId);
      setAllClasses(data);
    } catch { /* silently ignore */ }
  }

  async function selectAssignment(a) {
    setSelectedAssignment(a);
    try {
      const [r, lc] = await Promise.all([
        api.getRubricsByAssignment(a.id),
        api.getAssignmentClasses(a.id),
      ]);
      setRubrics(r);
      setLinkedClasses(lc);
    } catch (err) { showToast(err.message, 'error'); }
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function closeAssignmentModal() {
    setShowAssignmentModal(false);
    setEditingAssignment(null);
    setImageFile(null);
    setImagePreview(null);
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
      let saved;
      if (editingAssignment) {
        saved = await api.updateAssignment(editingAssignment.id, data);
        showToast('Đã cập nhật bài tập');
      } else {
        saved = await api.createAssignment(data);
        showToast('Đã tạo bài tập mới');
        onNotify?.(NOTIF_TYPES.NEW_ASSIGNMENT, 'Có bài tập mới', data.problem_text.slice(0, 60));
      }
      // Upload ảnh nếu người dùng chọn file mới
      if (imageFile && saved?.id) {
        setUploadingImage(true);
        try {
          await api.uploadAssignmentImage(saved.id, imageFile);
        } catch (imgErr) {
          showToast('Lưu bài tập OK nhưng upload ảnh thất bại: ' + imgErr.message, 'error');
        } finally {
          setUploadingImage(false);
        }
      }
      closeAssignmentModal();
      loadAssignments();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleDeleteProblemImage(assignmentId) {
    try {
      const updated = await api.deleteAssignmentImage(assignmentId);
      setSelectedAssignment(updated);
      showToast('Đã xoá ảnh đề bài');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleDeleteAssignment(id) {
    if (!confirm('Xoá bài tập này?')) return;
    try {
      await api.deleteAssignment(id);
      showToast('Đã xoá bài tập');
      if (selectedAssignment?.id === id) { setSelectedAssignment(null); setRubrics([]); setLinkedClasses([]); }
      loadAssignments();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleUploadImageForSelected(e) {
    const file = e.target.files[0];
    if (!file || !selectedAssignment) return;
    setUploadingImage(true);
    try {
      const updated = await api.uploadAssignmentImage(selectedAssignment.id, file);
      setSelectedAssignment(updated);
      showToast('Đã upload ảnh đề bài');
    } catch (err) { showToast(err.message, 'error'); }
    finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  async function toggleClassLink(cls) {
    const linked = linkedClasses.some(c => c.id === cls.id);
    setTogglingClass(cls.id);
    try {
      if (linked) {
        await api.unlinkAssignmentClass(selectedAssignment.id, cls.id);
        setLinkedClasses(prev => prev.filter(c => c.id !== cls.id));
      } else {
        await api.linkAssignmentClass(selectedAssignment.id, cls.id);
        setLinkedClasses(prev => [...prev, cls]);
      }
    } catch (err) { showToast(err.message, 'error'); }
    finally { setTogglingClass(null); }
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

  async function handleCreateMilestoneRubric(e) {
    e.preventDefault();
    if (milestones.length === 0) { showToast('Cần ít nhất 1 milestone!', 'error'); return; }
    try {
      await api.createRubric({
        title: rubricTitle || `Rubric milestone – Bài tập #${selectedAssignment.id}`,
        content: {
          milestones,
          problem_statement: selectedAssignment.problem_text,
        },
        assignment_id: selectedAssignment.id,
      });
      showToast('Đã tạo rubric milestone');
      setShowRubricModal(false);
      setMilestones([]);
      setRubricTitle('');
      const r = await api.getRubricsByAssignment(selectedAssignment.id);
      setRubrics(r);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleGenerateMilestones() {
    if (!selectedAssignment) { showToast('Chưa chọn bài tập!', 'error'); return; }
    setGeneratingMilestones(true);
    try {
      const res = await api.generateMilestones(selectedAssignment.id);
      setMilestones(res.milestones || []);
      const hasGroups = (res.milestones || []).some(m => m.question_group);
      showToast(`AI gợi ý ${res.milestones?.length || 0} milestone${hasGroups ? ' (phân nhóm theo câu)' : ''}. Hãy kiểm tra và chỉnh sửa!`);
    } catch (err) { showToast('Lỗi sinh milestone: ' + err.message, 'error'); }
    finally { setGeneratingMilestones(false); }
  }

  function addMilestone(questionGroup = null) {
    const id = `m${milestones.length + 1}`;
    setMilestones(prev => [...prev, { id, name: '', description: '', question_group: questionGroup }]);
  }

  function updateMilestone(idx, field, value) {
    setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function removeMilestone(idx) {
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  }

  function getMilestoneGroups() {
    const groups = [];
    const seen = new Set();
    for (const m of milestones) {
      const g = m.question_group || null;
      if (!seen.has(g)) { seen.add(g); groups.push(g); }
    }
    return groups;
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

  function MilestoneRow({ m, i }) {
    return (
      <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: 13, minWidth: 28, paddingTop: 7 }}>{m.id}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input className="form-input" style={{ marginBottom: 0, fontSize: 13 }}
            placeholder="Tên milestone (ngắn gọn)"
            value={m.name} onChange={e => updateMilestone(i, 'name', e.target.value)} required />
          <input className="form-input" style={{ marginBottom: 0, fontSize: 12 }}
            placeholder="Mô tả chi tiết (tuỳ chọn)"
            value={m.description} onChange={e => updateMilestone(i, 'description', e.target.value)} />
        </div>
        <button type="button" onClick={() => removeMilestone(i)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: '4px 2px', marginTop: 2 }}>✕</button>
      </div>
    );
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
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingAssignment(null); setImageFile(null); setImagePreview(null); setShowAssignmentModal(true); }}>
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
                        <button className="btn btn-secondary btn-sm btn-icon" title="Sửa" onClick={(e) => { e.stopPropagation(); setEditingAssignment(a); setImageFile(null); setImagePreview(null); setShowAssignmentModal(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Xoá" onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(a.id); }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel: class links + rubrics */}
        {selectedAssignment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Class linking section */}
            <div className="card animate-slide">
              <div className="card-header">
                <span className="card-title">🏫 Lớp được gán</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowClassModal(true)}>
                  Quản lý lớp
                </button>
              </div>
              {linkedClasses.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                  Chưa gán cho lớp nào.{' '}
                  <button className="btn btn-primary btn-sm" style={{ marginLeft: 6 }} onClick={() => setShowClassModal(true)}>
                    + Gán lớp
                  </button>
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                  {linkedClasses.map(cls => (
                    <span key={cls.id} className="badge badge-violet" style={{ fontSize: 13, padding: '4px 10px' }}>
                      {cls.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Rubric Panel */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📐 Rubric – Bài tập #{selectedAssignment.id}</span>
                <button className="btn btn-primary btn-sm" onClick={() => { setUploadMode(false); setShowRubricModal(true); }}>
                  + Thêm rubric
                </button>
              </div>

              <div style={{ padding: '0 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Đề bài:</strong> {selectedAssignment.problem_text}
                </p>
                {/* Ảnh đề bài */}
                {selectedAssignment.problem_image_url ? (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={getImageUrl(selectedAssignment.problem_image_url)}
                      alt="Ảnh đề bài"
                      style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'block' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        {uploadingImage ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> Đang upload...</> : '🔄 Đổi ảnh'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleUploadImageForSelected} disabled={uploadingImage} />
                      </label>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProblemImage(selectedAssignment.id)}>🗑️ Xoá ảnh</button>
                    </div>
                  </div>
                ) : (
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {uploadingImage ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> Đang upload...</> : '📷 Upload ảnh đề bài'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleUploadImageForSelected} disabled={uploadingImage} />
                  </label>
                )}
              </div>

              {rubrics.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📐</div>
                  <h3>Chưa có rubric</h3>
                  <p>Tạo rubric milestone bằng AI hoặc nhập thủ công</p>
                </div>
              ) : (
                rubrics.map((r) => (
                  <div key={r.id} className="criterion-card" style={{ marginBottom: 12 }}>
                    <div className="criterion-header">
                      <span className="criterion-name">📋 {r.title}</span>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteRubric(r.id)}>🗑️</button>
                    </div>
                    {r.content?.milestones ? (() => {
                      const ms = r.content.milestones;
                      const isGrouped = ms.some(m => m.question_group);
                      const groups = isGrouped
                        ? [...new Set(ms.map(m => m.question_group || null))]
                        : [null];
                      return (
                        <div style={{ marginTop: 8 }}>
                          {groups.map(group => (
                            <div key={group ?? '__flat'} style={{ marginBottom: group ? 10 : 0 }}>
                              {group && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', padding: '4px 0 2px', letterSpacing: 0.5 }}>
                                  📌 {group}
                                </div>
                              )}
                              {ms.filter(m => (m.question_group || null) === group).map((m, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                                  <span style={{ fontWeight: 700, color: 'var(--accent-light)', minWidth: 28 }}>{m.id}</span>
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                                    {m.description && <div style={{ color: 'var(--text-secondary)', fontSize: 11.5, marginTop: 1 }}>{m.description}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                          <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>{ms.length} milestone</div>
                        </div>
                      );
                    })() : r.content?.criteria ? (
                      <div style={{ marginTop: 8, padding: 8, background: 'rgba(251,191,36,.08)', borderRadius: 4, fontSize: 12, color: '#d97706' }}>
                        ⚠️ Rubric dạng cũ (criteria). Pipeline mới dùng milestone.
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="modal-overlay" onClick={closeAssignmentModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAssignment ? 'Sửa bài tập' : 'Tạo bài tập mới'}</h3>
              <button className="modal-close" onClick={closeAssignmentModal}>✕</button>
            </div>
            <form onSubmit={handleSaveAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Đề bài / Mô tả</label>
                  <textarea className="form-textarea" name="problem_text" rows="3" defaultValue={editingAssignment?.problem_text || ''} placeholder="Nhập nội dung đề bài..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">Ảnh đề bài <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(tuỳ chọn)</span></label>
                  {/* Preview ảnh hiện tại (khi edit) hoặc ảnh mới chọn */}
                  {(imagePreview || editingAssignment?.problem_image_url) && (
                    <div style={{ marginBottom: 8 }}>
                      <img
                        src={imagePreview || getImageUrl(editingAssignment.problem_image_url)}
                        alt="Preview đề bài"
                        style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                      />
                    </div>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="form-input"
                    style={{ padding: '6px 8px' }}
                    onChange={handleImageChange}
                  />
                  <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                    JPEG, PNG, WebP · tối đa 10 MB
                  </div>
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
                <button type="button" className="btn btn-secondary" onClick={closeAssignmentModal}>Huỷ</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingImage}>
                  {uploadingImage ? <><div className="spinner" style={{ width: 14, height: 14 }}></div> Đang upload...</> : (editingAssignment ? 'Cập nhật' : 'Tạo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Link Modal */}
      {showClassModal && (
        <div className="modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏫 Gán lớp học – Bài tập #{selectedAssignment.id}</h3>
              <button className="modal-close" onClick={() => setShowClassModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {allClasses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Bạn chưa có lớp nào. Hãy tạo lớp ở trang Lớp học trước.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allClasses.map(cls => {
                    const isLinked = linkedClasses.some(c => c.id === cls.id);
                    const isToggling = togglingClass === cls.id;
                    return (
                      <label key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius)', border: `1px solid ${isLinked ? 'var(--accent)' : 'var(--border)'}`, background: isLinked ? 'var(--accent-bg)' : 'var(--bg-surface)', cursor: 'pointer', transition: 'all .15s' }}>
                        <input
                          type="checkbox"
                          checked={isLinked}
                          disabled={isToggling}
                          onChange={() => toggleClassLink(cls)}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{cls.name}</div>
                          {cls.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cls.description}</div>}
                        </div>
                        {isToggling && <div className="spinner" style={{ width: 14, height: 14 }}></div>}
                        {isLinked && !isToggling && <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>Đã gán</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowClassModal(false)}>Xong</button>
            </div>
          </div>
        </div>
      )}

      {/* Rubric Modal – Milestone-based */}
      {showRubricModal && (
        <div className="modal-overlay" onClick={() => { setShowRubricModal(false); setMilestones([]); setRubricTitle(''); }}>
          <div className="modal" style={{ maxWidth: 640, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎯 Tạo Rubric Milestone</h3>
              <button className="modal-close" onClick={() => { setShowRubricModal(false); setMilestones([]); setRubricTitle(''); }}>✕</button>
            </div>
            <form onSubmit={handleCreateMilestoneRubric}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Tiêu đề rubric</label>
                  <input className="form-input" placeholder="Ví dụ: Rubric Phương trình bậc nhất"
                    value={rubricTitle} onChange={e => setRubricTitle(e.target.value)} />
                </div>

                <div style={{ padding: 12, background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16, fontSize: 13 }}>
                  <strong>Đề bài:</strong> {selectedAssignment?.problem_text}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Danh sách Milestone ({milestones.length})</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleGenerateMilestones} disabled={generatingMilestones}>
                      {generatingMilestones
                        ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> AI đang sinh...</>
                        : '✨ AI gợi ý milestone'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => addMilestone(null)}>+ Thêm</button>
                  </div>
                </div>

                {milestones.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    {selectedAssignment?.problem_image_url
                      ? 'Nhấn "AI gợi ý milestone" để AI đọc ảnh đề bài và tạo milestone tự động.'
                      : 'Nhấn "AI gợi ý milestone" để tạo tự động hoặc "+ Thêm" để nhập thủ công.'}
                  </div>
                ) : (() => {
                  const groups = getMilestoneGroups();
                  const isGrouped = groups.some(g => g !== null);
                  if (!isGrouped) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {milestones.map((m, i) => <MilestoneRow key={i} m={m} i={i} />)}
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {groups.map(group => (
                        <div key={group ?? '__ungrouped'}>
                          {group && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                📌 {group}
                              </div>
                              <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => addMilestone(group)}>
                                + Thêm vào {group}
                              </button>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: group ? 8 : 0, borderLeft: group ? '2px solid var(--accent-bg)' : 'none' }}>
                            {milestones.map((m, i) => m.question_group === group ? <MilestoneRow key={i} m={m} i={i} /> : null)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowRubricModal(false); setMilestones([]); setRubricTitle(''); }}>Huỷ</button>
                <button type="submit" className="btn btn-primary" disabled={milestones.length === 0}>💾 Lưu rubric milestone</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
