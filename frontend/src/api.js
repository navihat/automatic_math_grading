/**
 * API Client – Kết nối Frontend ↔ Backend
 */
const API_BASE = 'http://localhost:8000/api';
const SERVER_BASE = 'http://localhost:8000';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Có lỗi xảy ra');
  }
  return res.json();
}

export const api = {
  // ── Auth ──
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // ── Classes ──
  getClasses: (userId = 1) => request(`/classes/teacher/${userId}`),
  getClass: (id) => request(`/classes/${id}`),
  createClass: (data) => request('/classes/', { method: 'POST', body: JSON.stringify(data) }),
  updateClass: (id, data) => request(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClass: (id) => request(`/classes/${id}`, { method: 'DELETE' }),

  // ── Students ──
  getStudents: (classId) => request(`/classes/${classId}/students`),
  addStudent: (classId, data) => request(`/classes/${classId}/students`, { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => request(`/classes/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id) => request(`/classes/students/${id}`, { method: 'DELETE' }),

  // ── Assignments ──
  getAssignments: (userId = 1) => request(`/assignments/teacher/${userId}`),
  getAssignmentsByClass: (classId) => request(`/assignments/class/${classId}`),
  getAssignment: (id) => request(`/assignments/${id}`),
  createAssignment: (data) => request('/assignments/', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: (id) => request(`/assignments/${id}`, { method: 'DELETE' }),

  // ── Rubrics ──
  getRubricsByAssignment: (assignmentId) => request(`/rubrics/assignment/${assignmentId}`),
  getRubric: (id) => request(`/rubrics/${id}`),
  createRubric: (data) => request('/rubrics/', { method: 'POST', body: JSON.stringify(data) }),
  uploadRubric: (formData) =>
    fetch(`${API_BASE}/rubrics/upload`, { method: 'POST', body: formData }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Upload thất bại');
      return r.json();
    }),
  updateRubric: (id, data) => request(`/rubrics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRubric: (id) => request(`/rubrics/${id}`, { method: 'DELETE' }),

  // ── Submissions & Grading ──
  gradeSubmission: (formData) =>
    fetch(`${API_BASE}/submissions/grade`, { method: 'POST', body: formData }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Chấm điểm thất bại');
      return r.json();
    }),
  regradeSubmission: (submissionId) => request(`/submissions/${submissionId}/regrade`, { method: 'POST' }),
  getSubmissionsByRubric: (rubricId) => request(`/submissions/rubric/${rubricId}`),
  getSubmissionsByStudent: (studentId) => request(`/submissions/student/${studentId}`),
  getSubmission: (id) => request(`/submissions/${id}`),

  // ── Results & Feedback ──
  getResultsBySubmission: (submissionId) => request(`/results/submission/${submissionId}`),
  getResult: (id) => request(`/results/${id}`),
  addFeedback: (data) => request('/results/feedback', { method: 'POST', body: JSON.stringify(data) }),
  updateFeedback: (id, data) => request(`/results/feedback/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

/** Chuyển relative URL (từ backend) thành absolute URL để hiển thị ảnh */
export function getImageUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `${SERVER_BASE}${relativeUrl}`;
}
