import { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';

export default function ClassesPage({ teacherId }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const { toast, showToast } = useToast();

  useEffect(() => { loadClasses(); }, [teacherId]);

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
    return <LoadingState />;
  }

  return (
    <div className="animate-fade">
      <Toast toast={toast} />

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
            <EmptyState icon="🏫" title="Chưa có lớp học" description="Tạo lớp học đầu tiên" />
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
              <EmptyState icon="👨‍🎓" title="Chưa có học sinh" description={`Thêm học sinh vào lớp ${selectedClass.name}`} />
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
        <Modal title={editingClass ? 'Sửa lớp học' : 'Thêm lớp học mới'} onClose={() => { setShowClassModal(false); setEditingClass(null); }}>
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
              <button type="button" className="btn btn-secondary" onClick={() => { setShowClassModal(false); setEditingClass(null); }}>Huỷ</button>
              <button type="submit" className="btn btn-primary">{editingClass ? 'Cập nhật' : 'Tạo mới'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Student Modal */}
      {showStudentModal && (
        <Modal title={editingStudent ? 'Sửa học sinh' : 'Thêm học sinh'} onClose={() => { setShowStudentModal(false); setEditingStudent(null); }}>
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
                  <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Mật khẩu mặc định = Mã học sinh (học sinh đăng nhập lần đầu bằng mã này)
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowStudentModal(false); setEditingStudent(null); }}>Huỷ</button>
              <button type="submit" className="btn btn-primary">{editingStudent ? 'Cập nhật' : 'Thêm'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
