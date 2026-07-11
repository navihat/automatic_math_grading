import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

export default function ClassesPage({ teacherId }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadClasses(); }, [teacherId]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadClasses() {
    try {
      const data = await api.getClasses(teacherId);
      setClasses(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents(classId) {
    try {
      const data = await api.getStudents(classId);
      setStudents(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleSelectClass(cls) {
    setSelectedClass(cls);
    await loadStudents(cls.id);
  }

  async function handleSaveClass(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { name: fd.get('name'), year: parseInt(fd.get('year')), user_id: teacherId };
    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, data);
        showToast('Đã cập nhật lớp học');
      } else {
        await api.createClass(data);
        showToast('Đã tạo lớp học mới');
      }
      setShowClassModal(false);
      setEditingClass(null);
      loadClasses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDeleteClass(id) {
    if (!confirm('Bạn chắc chắn muốn xoá lớp này?')) return;
    try {
      await api.deleteClass(id);
      showToast('Đã xoá lớp học');
      if (selectedClass?.id === id) {
        setSelectedClass(null);
        setStudents([]);
      }
      loadClasses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleSaveStudent(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { name: fd.get('name'), student_code: fd.get('student_code'), class_id: selectedClass.id };
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, { name: data.name });
        showToast('Đã cập nhật học sinh');
      } else {
        await api.addStudent(selectedClass.id, data);
        showToast('Đã thêm học sinh');
      }
      setShowStudentModal(false);
      setEditingStudent(null);
      loadStudents(selectedClass.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDeleteStudent(id) {
    if (!confirm('Bạn chắc chắn muốn xoá học sinh này?')) return;
    try {
      await api.deleteStudent(id);
      showToast('Đã xoá học sinh');
      loadStudents(selectedClass.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) {
    return <div className="loading-state"><div className="spinner spinner-lg"></div><span>Đang tải...</span></div>;
  }

  return (
    <div className="animate-fade">
      {toast && createPortal(
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>,
        document.body
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedClass ? '1fr 1.5fr' : '1fr', gap: 24 }}>
        {/* Classes List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏫 Danh sách lớp học</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingClass(null); setShowClassModal(true); }}>
              + Thêm lớp
            </button>
          </div>
          {classes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏫</div>
              <h3>Chưa có lớp học</h3>
              <p>Tạo lớp học đầu tiên</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên lớp</th>
                  <th>Năm</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr
                    key={cls.id}
                    onClick={() => handleSelectClass(cls)}
                    style={{ cursor: 'pointer', background: selectedClass?.id === cls.id ? 'var(--accent-bg)' : undefined }}
                  >
                    <td style={{ fontWeight: 600 }}>{cls.name}</td>
                    <td><span className="badge badge-info">{cls.year}</span></td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm btn-icon" title="Sửa" onClick={(e) => { e.stopPropagation(); setEditingClass(cls); setShowClassModal(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Xoá" onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Students Panel */}
        {selectedClass && (
          <div className="card animate-slide">
            <div className="card-header">
              <span className="card-title">👨‍🎓 Học sinh – {selectedClass.name}</span>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingStudent(null); setShowStudentModal(true); }}>
                + Thêm HS
              </button>
            </div>
            {students.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🎓</div>
                <h3>Chưa có học sinh</h3>
                <p>Thêm học sinh vào lớp {selectedClass.name}</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã HS</th>
                    <th>Họ tên</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td><span className="tag">{s.student_code}</span></td>
                      <td>{s.name}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-secondary btn-sm btn-icon" title="Sửa" onClick={() => { setEditingStudent(s); setShowStudentModal(true); }}>✏️</button>
                          <button className="btn btn-danger btn-sm btn-icon" title="Xoá" onClick={() => handleDeleteStudent(s.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Class Modal */}
      {showClassModal && (
        <div className="modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClass ? 'Sửa lớp học' : 'Thêm lớp học mới'}</h3>
              <button className="modal-close" onClick={() => setShowClassModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveClass}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên lớp</label>
                  <input className="form-input" name="name" defaultValue={editingClass?.name || ''} placeholder="Ví dụ: 10A1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Năm học</label>
                  <input className="form-input" name="year" type="number" defaultValue={editingClass?.year || new Date().getFullYear()} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowClassModal(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">{editingClass ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingStudent ? 'Sửa học sinh' : 'Thêm học sinh'}</h3>
              <button className="modal-close" onClick={() => setShowStudentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveStudent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Họ tên</label>
                  <input className="form-input" name="name" defaultValue={editingStudent?.name || ''} placeholder="Nguyễn Văn A" required />
                </div>
                {!editingStudent && (
                  <div className="form-group">
                    <label className="form-label">Mã học sinh</label>
                    <input className="form-input" name="student_code" placeholder="HS001" required />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">{editingStudent ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
