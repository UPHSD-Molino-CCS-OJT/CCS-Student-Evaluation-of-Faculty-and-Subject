// Additional type definitions for component-level types
import { Evaluation } from './index';

// Form data for evaluation
export interface EvaluationFormData {
  // Teacher ratings (1-5)
  teacher_care: string;
  teacher_respect: string;
  teacher_patience: string;
  teacher_shows_mastery: string;
  teacher_updated_informed: string;
  teacher_demonstrates_competence: string;
  // Learning Process ratings (1-5)
  learning_clear_objectives: string;
  learning_syllabus_followed: string;
  learning_starts_ends_on_time: string;
  learning_concepts_understood: string;
  learning_materials_appropriate: string;
  learning_allows_questions: string;
  learning_encourages_participation: string;
  learning_provides_relevant_examples: string;
  learning_provides_activities: string;
  learning_relates_to_life: string;
  learning_relates_to_other_subjects: string;
  learning_fair_grading: string;
  learning_returns_outputs_on_time: string;
  // Classroom Management ratings (1-5)
  classroom_starts_on_time: string;
  classroom_time_managed_effectively: string;
  classroom_student_behavior: string;
  classroom_conducive_environment: string;
  classroom_appropriate_strategies: string;
  classroom_communication_channels: string;
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

// Evaluation with populated fields
export interface PopulatedEvaluation extends Evaluation {
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
  };
}
