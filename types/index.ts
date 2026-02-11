import { Document, Types } from 'mongoose';
import { Request } from 'express';
import session from 'express-session';

// Admin Interface
export interface IAdmin extends Document {
  _id: Types.ObjectId;
  username: string;
  password: string;
  full_name: string;
  email?: string;
  last_login?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Program Interface
export interface IProgram extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

// Teacher Interface
export interface ITeacher extends Document {
  _id: Types.ObjectId;
  full_name: string;
  employee_id: string;
  email?: string;
  department?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Course Interface
export interface ICourse extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  program_id: Types.ObjectId | IProgram;
  createdAt: Date;
  updatedAt: Date;
}

// Student Interface
export interface IStudent extends Document {
  _id: Types.ObjectId;
  student_number: string;
  full_name: string;
  email?: string;
  program_id: Types.ObjectId | IProgram;
  year_level: '1st' | '2nd' | '3rd' | '4th';
  section?: string;
  status: 'Regular' | 'Irregular' | 'Transferee';
  createdAt: Date;
  updatedAt: Date;
}

// Enrollment Interface
export interface IEnrollment extends Document {
  _id: Types.ObjectId;
  student_id: Types.ObjectId | IStudent;
  course_id: Types.ObjectId | ICourse;
  teacher_id: Types.ObjectId | ITeacher;
  section_code: string;
  school_year: string;
  semester: '1st Semester' | '2nd Semester' | 'Summer';
  has_evaluated: boolean;
  submission_token?: string;
  submission_token_used?: boolean;
  receipt_hash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Evaluation Interface
export interface IEvaluation extends Document {
  _id: Types.ObjectId;
  school_year: string;
  anonymous_token: string;
  program_id: Types.ObjectId | IProgram;
  year_level: '1st' | '2nd' | '3rd' | '4th';
  status: 'Regular' | 'Irregular' | 'Transferee';
  course_id: Types.ObjectId | ICourse;
  teacher_id: Types.ObjectId | ITeacher | null;
  
  // Teacher ratings (6 criteria)
  teacher_diction: number;
  teacher_grammar: number;
  teacher_personality: number;
  teacher_disposition: number;
  teacher_dynamic: number;
  teacher_fairness: number;
  
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
  
  // Classroom management ratings (6 criteria)
  classroom_attendance: number;
  classroom_policies: number;
  classroom_discipline: number;
  classroom_authority: number;
  classroom_prayers: number;
  classroom_punctuality: number;
  
  comments?: string;
  ip_address?: string;
  submitted_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Session Data Interface
export interface ISessionData {
  adminId?: string;
  username?: string;
  fullName?: string;
  studentId?: string;
}

// Extend express-session module to add our custom session data
declare module 'express-session' {
  interface SessionData extends ISessionData {}
}

// Request with session - flash method comes from connect-flash  
export interface IRequest extends Request {
  session: session.Session & session.SessionData;
}
