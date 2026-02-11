import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type {
  LoginCredentials,
  Teacher,
  Program,
  Course,
  Student,
  Evaluation,
  DashboardStats,
  AuditResults,
  Enrollment,
  AuthState
} from '../types';

/**
 * API Service Layer
 * Centralized API configuration and methods
 */

// Configure axios defaults
const api: AxiosInstance = axios.create({
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
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
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
          console.error('Access forbidden:', (error.response.data as any).message);
          break;
        case 404:
          console.error('Resource not found:', (error.response.data as any).message);
          break;
        case 500:
          console.error('Server error:', (error.response.data as any).message);
          break;
        default:
          console.error('API error:', (error.response.data as any).message);
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
  login: (credentials: LoginCredentials): Promise<AxiosResponse<{ success: boolean }>> =>
    api.post('/api/student/login', credentials),
  
  // Get subjects/enrollments
  getSubjects: (): Promise<AxiosResponse<{ authenticated: boolean; student?: any; enrollments?: Enrollment[] }>> =>
    api.get('/api/student/subjects'),
  
  // Get enrollment details
  getEnrollment: (enrollmentId: string): Promise<AxiosResponse<{ success: boolean; enrollment?: Enrollment; message?: string }>> =>
    api.get(`/api/student/enrollment/${enrollmentId}`),
  
  // Submit evaluation
  submitEvaluation: (data: Record<string, any>): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.post('/api/student/submit-evaluation', data),
  
  // Logout
  logout: (): Promise<AxiosResponse> =>
    api.post('/api/student/logout'),
};

// ==================== ADMIN API METHODS ====================

export const adminApi = {
  // Auth
  checkAuth: (): Promise<AxiosResponse<AuthState>> =>
    api.get('/api/admin/check-auth'),
    
  login: (credentials: LoginCredentials): Promise<AxiosResponse<{ success: boolean; admin?: any }>> =>
    api.post('/api/admin/login', credentials),
    
  logout: (): Promise<AxiosResponse> =>
    api.post('/api/admin/logout'),
  
  // Dashboard
  getDashboard: (): Promise<AxiosResponse<DashboardStats>> =>
    api.get('/api/admin/dashboard'),
  
  // Evaluations
  getEvaluations: (): Promise<AxiosResponse<{ evaluations: Evaluation[] }>> =>
    api.get('/api/admin/evaluations'),
    
  getEvaluation: (id: string): Promise<AxiosResponse<{ evaluation: Evaluation }>> =>
    api.get(`/api/admin/evaluations/${id}`),
  
  // Teachers
  getTeachers: (): Promise<AxiosResponse<{ teachers: Teacher[] }>> =>
    api.get('/api/admin/teachers'),
    
  createTeacher: (data: Partial<Teacher>): Promise<AxiosResponse<{ success: boolean; teacher: Teacher }>> =>
    api.post('/api/admin/teachers', data),
    
  updateTeacher: (id: string, data: Partial<Teacher>): Promise<AxiosResponse<{ success: boolean; teacher: Teacher }>> =>
    api.put(`/api/admin/teachers/${id}`, data),
    
  deleteTeacher: (id: string): Promise<AxiosResponse<{ success: boolean }>> =>
    api.delete(`/api/admin/teachers/${id}`),
  
  // Programs
  getPrograms: (): Promise<AxiosResponse<{ programs: Program[] }>> =>
    api.get('/api/admin/programs'),
    
  createProgram: (data: Partial<Program>): Promise<AxiosResponse<{ success: boolean; program: Program }>> =>
    api.post('/api/admin/programs', data),
    
  updateProgram: (id: string, data: Partial<Program>): Promise<AxiosResponse<{ success: boolean; program: Program }>> =>
    api.put(`/api/admin/programs/${id}`, data),
    
  deleteProgram: (id: string): Promise<AxiosResponse<{ success: boolean }>> =>
    api.delete(`/api/admin/programs/${id}`),
  
  // Courses
  getCourses: (): Promise<AxiosResponse<{ courses: Course[] }>> =>
    api.get('/api/admin/courses'),
    
  createCourse: (data: Partial<Course>): Promise<AxiosResponse<{ success: boolean; course: Course }>> =>
    api.post('/api/admin/courses', data),
    
  updateCourse: (id: string, data: Partial<Course>): Promise<AxiosResponse<{ success: boolean; course: Course }>> =>
    api.put(`/api/admin/courses/${id}`, data),
    
  deleteCourse: (id: string): Promise<AxiosResponse<{ success: boolean }>> =>
    api.delete(`/api/admin/courses/${id}`),
  
  // Students
  getStudents: (): Promise<AxiosResponse<{ students: Student[] }>> =>
    api.get('/api/admin/students'),
    
  createStudent: (data: Partial<Student>): Promise<AxiosResponse<{ success: boolean; student: Student }>> =>
    api.post('/api/admin/students', data),
    
  updateStudent: (id: string, data: Partial<Student>): Promise<AxiosResponse<{ success: boolean; student: Student }>> =>
    api.put(`/api/admin/students/${id}`, data),
    
  deleteStudent: (id: string): Promise<AxiosResponse<{ success: boolean }>> =>
    api.delete(`/api/admin/students/${id}`),
  
  // Privacy Audit
  runPrivacyAudit: (): Promise<AxiosResponse<{ results: AuditResults }>> =>
    api.post('/api/admin/privacy-audit/run'),
};

export default api;
