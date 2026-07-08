// CR-053: Training API client — talks to training backend only
import axios from 'axios';

// Training backend URL — served from same origin or separate
const TRAINING_API_BASE = window.__TRAINING_API_URL || (window.location.origin + '/api/training');
// For local dev, the training backend is on port 8002
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8002/api/training'
  : TRAINING_API_BASE;

const api = axios.create({ baseURL: API_URL });

// Inject POS auth token into every request (READ-ONLY from localStorage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const trainingApi = {
  // Catalog
  getCourses: () => api.get('/courses').then(r => r.data),
  getMissions: (courseId) => api.get(`/courses/${courseId}/missions`).then(r => r.data),

  // Progress
  getMyProgress: () => api.get('/progress/me').then(r => r.data),
  startMission: (courseId, missionId) =>
    api.post('/progress/start', { course_id: courseId, mission_id: missionId }).then(r => r.data),
  completeStep: (courseId, missionId, stepId, timeSpent = 0) =>
    api.post('/progress/step-complete', {
      course_id: courseId, mission_id: missionId,
      step_id: stepId, time_spent_seconds: timeSpent
    }).then(r => r.data),
  skipMission: (courseId, missionId, reason = '') =>
    api.post('/progress/skip-mission', { course_id: courseId, mission_id: missionId, reason }).then(r => r.data),
  resetMission: (courseId, missionId) =>
    api.post('/progress/reset-mission', { course_id: courseId, mission_id: missionId }).then(r => r.data),

  // Manager
  getStaffOverview: () => api.get('/manager/overview').then(r => r.data),
  getEmployeeDetail: (empId) => api.get(`/manager/employee/${empId}`).then(r => r.data),
  assignCourse: (empId, courseId, deadline) =>
    api.post('/manager/assign', { employee_id: empId, course_id: courseId, deadline }).then(r => r.data),
};
