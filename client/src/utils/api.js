import axios from 'axios';

/**
 * API Service Layer
 * Centralized API configuration and methods
 */

// Configure axios defaults
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            const isAdmin = window.location.pathname.includes('/admin');
            window.location.href = isAdmin ? '/admin/login' : '/student/login';
          }
          break;
        case 403:
          console.error('Access forbidden:', error.response.data.message);
          break;
        case 404:
          console.error('Resource not found:', error.response.data.message);
          break;
        case 500:
          console.error('Server error:', error.response.data.message);
          break;
        default:
          console.error('API error:', error.response.data.message);
      }
    } else if (error.request) {
      console.error('Network error: No response received');
    } else {
      console.error('Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ==================== STUDENT API METHODS ====================

export const studentApi = {
  // Login
  login: (credentials) => api.post('/api/student/login', credentials),
  
  // Get subjects/enrollments
  getSubjects: () => api.get('/api/student/subjects'),
  
  // Get enrollment details
  getEnrollment: (enrollmentId) => api.get(`/api/student/enrollment/${enrollmentId}`),
  
  // Submit evaluation
  submitEvaluation: (data) => api.post('/api/student/submit-evaluation', data),
  
  // Logout
  logout: () => api.post('/api/student/logout'),
};

// ==================== ADMIN API METHODS ====================

export const adminApi = {
  // Auth
  checkAuth: () => api.get('/api/admin/check-auth'),
  login: (credentials) => api.post('/api/admin/login', credentials),
  logout: () => api.post('/api/admin/logout'),
  
  // Dashboard
  getDashboard: () => api.get('/api/admin/dashboard'),
  
  // Evaluations
  getEvaluations: () => api.get('/api/admin/evaluations'),
  getEvaluation: (id) => api.get(`/api/admin/evaluations/${id}`),
  
  // Teachers
  getTeachers: () => api.get('/api/admin/teachers'),
  createTeacher: (data) => api.post('/api/admin/teachers', data),
  updateTeacher: (id, data) => api.put(`/api/admin/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/api/admin/teachers/${id}`),
  
  // Programs
  getPrograms: () => api.get('/api/admin/programs'),
  createProgram: (data) => api.post('/api/admin/programs', data),
  updateProgram: (id, data) => api.put(`/api/admin/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/api/admin/programs/${id}`),
  
  // Courses
  getCourses: () => api.get('/api/admin/courses'),
  createCourse: (data) => api.post('/api/admin/courses', data),
  updateCourse: (id, data) => api.put(`/api/admin/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/api/admin/courses/${id}`),
  
  // Students
  getStudents: () => api.get('/api/admin/students'),
  createStudent: (data) => api.post('/api/admin/students', data),
  updateStudent: (id, data) => api.put(`/api/admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/api/admin/students/${id}`),
  
  // Privacy Audit
  runPrivacyAudit: () => api.post('/api/admin/privacy-audit/run'),
};

export default api;
