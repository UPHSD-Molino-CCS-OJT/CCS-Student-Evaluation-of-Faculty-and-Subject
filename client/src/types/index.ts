/**
 * Frontend Type Definitions
 * Shared types for React components and utilities
 */

// API Response Types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Evaluation Types
export interface Rating {
  label: string;
  color: string;
}

export interface RatingScale {
  [key: number]: Rating;
}

export interface EvaluationQuestion {
  id: string;
  category: string;
  text: string;
  field?: string;
}

export interface EvaluationSection {
  title: string;
  description: string;
  icon: string;
  questions: EvaluationQuestion[];
}

export interface EvaluationSections {
  [key: string]: EvaluationSection;
}

export interface FormData {
  [key: string]: any;
}

export interface EvaluationDraft {
  formData: FormData;
  timestamp: string;
  enrollmentId: string;
}

// Validation Types
export interface ValidationErrors {
  [key: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  missingFields?: string[];
}

// Entity Types (frontend representations)
export interface Teacher {
  _id: string;
  full_name: string;
  employee_id?: string;
  email?: string;
  department?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
}

export interface Program {
  _id: string;
  name: string;
  code: string;
}

export interface Course {
  _id: string;
  name: string;
  code: string;
  program_id: string | Program;
}

export interface Student {
  _id: string;
  student_number: string;
  program_id: string | Program;
  program?: Program;
  year_level: '1st' | '2nd' | '3rd' | '4th';
  status: 'Regular' | 'Irregular' | 'Transferee';
  school_year: string;
  semester: string;
}

export interface Enrollment {
  _id: string;
  student_id: string | Student;
  course_id: string | Course;
  course?: Course;
  teacher_id: string | Teacher;
  teacher?: Teacher;
  section_code?: string;
  school_year: string;
  semester: '1st Semester' | '2nd Semester' | 'Summer';
  has_evaluated: boolean;
  receipt_hash?: string; // Cryptographic receipt for verification (no reversible link)
}

export interface Evaluation {
  _id: string;
  school_year: string;
  program_id: string | Program;
  program?: Program;
  year_level: string;
  status: string;
  course_id: string | Course;
  course?: Course;
  teacher_id: string | Teacher;
  teacher?: Teacher;
  
  // Teacher ratings (6 criteria)
  teacher_diction: number;
  teacher_grammar: number;
  teacher_personality: number;
  teacher_disposition: number;
  teacher_dynamic: number;
  teacher_fairness: number;
  teacher_average: number;
  
  // Learning process ratings (13 criteria)
  learning_motivation: number;
  learning_critical_thinking: number;
  learning_organization: number;
  learning_interest: number;
  learning_explanation: number;
  learning_clarity: number;
  learning_integration: number;
  learning_mastery: number;
  learning_methodology: number;
  learning_values: number;
  learning_grading: number;
  learning_synthesis: number;
  learning_reasonableness: number;
  learning_average: number;
  
  // Classroom management ratings (6 criteria)
  classroom_attendance: number;
  classroom_policies: number;
  classroom_discipline: number;
  classroom_authority: number;
  classroom_prayers: number;
  classroom_punctuality: number;
  classroom_average: number;
  
  overall_average: number;
  comments?: string;
  submitted_at: Date;
  createdAt?: Date;
}

// Dashboard Types
export interface DPBudgetStatus {
  currentBudget: number;
  queriesUsed: number;
  windowStart: string;
  windowEnd: string;
  budgetExhausted: boolean;
  maxQueries: number;
  totalBudget: number;
}

export interface DashboardStats {
  totalEvaluations: number;
  totalTeachers: number;
  totalPrograms: number;
  averageRatings: {
    teacher: number;
    learning: number;
    classroom: number;
    overall: number;
  };
  topTeachers: Array<{
    _id: string;
    full_name: string;
    average_rating: number;
    evaluation_count: number;
  }>;
  recentEvaluations: Evaluation[];
  dpBudgetStatus?: DPBudgetStatus;
  privacyNotice?: string;
}

// Privacy Audit Types
export interface AuditIssue {
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  timestamp?: Date;
}

export interface AuditResults {
  timestamp: Date;
  status: string;
  issues: AuditIssue[];
  warnings: AuditIssue[];
  summary: {
    totalEvaluations: number;
    evaluationsChecked: number;
    issuesFound: number;
    warningsFound: number;
  };
}

// Auth Types
export interface LoginCredentials {
  username?: string;
  password?: string;
  student_number?: string;
  birthdate?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName?: string;
}

export interface AuthState {
  authenticated: boolean;
  admin?: AdminUser;
  student?: Student;
}

// Re-export component types
export * from './components'
