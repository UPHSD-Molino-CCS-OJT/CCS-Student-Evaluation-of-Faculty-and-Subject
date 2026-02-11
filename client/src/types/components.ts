// Additional type definitions for component-level types
import { Evaluation } from './index';

// Form data for evaluation
export interface EvaluationFormData {
  // Teacher ratings (6 criteria)
  teacher_diction: string;
  teacher_grammar: string;
  teacher_personality: string;
  teacher_disposition: string;
  teacher_dynamic: string;
  teacher_fairness: string;
  // Learning Process ratings (13 criteria)
  learning_motivation: string;
  learning_critical_thinking: string;
  learning_organization: string;
  learning_interest: string;
  learning_explanation: string;
  learning_clarity: string;
  learning_integration: string;
  learning_mastery: string;
  learning_methodology: string;
  learning_values: string;
  learning_grading: string;
  learning_synthesis: string;
  learning_reasonableness: string;
  // Classroom Management ratings (6 criteria)
  classroom_attendance: string;
  classroom_policies: string;
  classroom_discipline: string;
  classroom_authority: string;
  classroom_prayers: string;
  classroom_punctuality: string;
  // Comments (optional)
  comments: string;
}

// Type helper for form data keys (without comments)
export type EvaluationFormDataKey = keyof Omit<EvaluationFormData, 'comments'>;

// Rating option for UI
export interface RatingOption {
  value: string;
  label: string;
  color: string;
}

// Section names
export type SectionName = 'teacher' | 'learning' | 'classroom';

// Props for rating question component
export interface RatingQuestionProps {
  name: keyof EvaluationFormData;
  label: string;
  section?: SectionName;
}

// Props for rating item (admin view)
export interface RatingItemProps {
  label: string;
  rating: number;
}

export interface AuditCheck {
  name: string;
  description: string;
  passed: boolean;
  details?: string;
}

export interface AuditRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

export interface DetailedAuditResults {
  overall_compliance: boolean;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  checks: AuditCheck[];
  recommendations: AuditRecommendation[];
  timestamp: Date;
}

// Top teacher stats (admin dashboard)
export interface TopTeacher {
  _id: string;
  full_name: string;
  evaluation_count: number;
  average_rating: number | null;
}

// Evaluation with populated fields (using Omit to allow narrower types for populated fields)
export interface PopulatedEvaluation extends Omit<Evaluation, 'teacher' | 'course' | 'program'> {
  teacher?: {
    _id: string;
    full_name: string;
  };
  course?: {
    _id: string;
    name: string;
    code: string;
  };
  program?: {
    _id: string;
    name: string;
    code: string;
  };
}
