import { Document, Types } from 'mongoose';
import { Request } from 'express';
import session from 'express-session';
import { EncryptedData } from '../utils/encryption';
export interface IAdmin extends Document {
    _id: Types.ObjectId;
    username: EncryptedData | string;
    password: string;
    full_name: EncryptedData | string;
    email?: EncryptedData | string;
    last_login?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface IProgram extends Document {
    _id: Types.ObjectId;
    name: EncryptedData | string;
    code: EncryptedData | string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ITeacher extends Document {
    _id: Types.ObjectId;
    full_name: EncryptedData | string;
    employee_id: EncryptedData | string;
    email?: EncryptedData | string;
    department?: EncryptedData | string;
    status: EncryptedData | string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ICourse extends Document {
    _id: Types.ObjectId;
    name: EncryptedData | string;
    code: EncryptedData | string;
    program_id: Types.ObjectId | IProgram;
    createdAt: Date;
    updatedAt: Date;
}
export interface IStudent extends Document {
    _id: Types.ObjectId;
    student_number: EncryptedData | string;
    program_id: Types.ObjectId | IProgram;
    year_level: EncryptedData | string;
    section?: EncryptedData | string;
    status: EncryptedData | string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IEnrollment extends Document {
    _id: Types.ObjectId;
    student_id: Types.ObjectId | IStudent;
    course_id: Types.ObjectId | ICourse;
    teacher_id: Types.ObjectId | ITeacher;
    section_code: EncryptedData | string;
    school_year: EncryptedData | string;
    semester: EncryptedData | string;
    has_evaluated: boolean;
    submission_token?: string;
    submission_token_used?: boolean;
    receipt_hash?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IEvaluation extends Document {
    _id: Types.ObjectId;
    school_year: EncryptedData | string;
    anonymous_token: string;
    program_id: Types.ObjectId | IProgram;
    year_level: EncryptedData | string;
    status: EncryptedData | string;
    course_id: Types.ObjectId | ICourse;
    teacher_id: Types.ObjectId | ITeacher | null;
    teacher_diction: number;
    teacher_grammar: number;
    teacher_personality: number;
    teacher_disposition: number;
    teacher_dynamic: number;
    teacher_fairness: number;
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
    classroom_attendance: number;
    classroom_policies: number;
    classroom_discipline: number;
    classroom_authority: number;
    classroom_prayers: number;
    classroom_punctuality: number;
    comments?: EncryptedData;
    ip_address?: string;
    submitted_at: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface ISessionData {
    adminId?: string;
    username?: string;
    fullName?: string;
    studentId?: string;
}
declare module 'express-session' {
    interface SessionData extends ISessionData {
    }
}
export interface IRequest extends Request {
    session: session.Session & session.SessionData;
}
//# sourceMappingURL=index.d.ts.map