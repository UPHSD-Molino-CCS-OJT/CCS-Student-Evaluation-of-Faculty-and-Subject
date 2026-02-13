import { Router, Response } from 'express';
import bcrypt from 'bcrypt';

// Import Models
import Admin from '../models/Admin';
import Program from '../models/Program';
import Teacher from '../models/Teacher';
import Course from '../models/Course';
import Evaluation from '../models/Evaluation';
import Student from '../models/Student';
import Enrollment from '../models/Enrollment';

// Import types
import { IRequest, IEnrollment } from '../types';
import { Types } from 'mongoose';

// Import Privacy Protection Utilities
import PrivacyProtection from '../utils/privacy-protection';
import { encryptField, decryptField, isEncryptionConfigured, EncryptedData } from '../utils/encryption';
import { safeDecrypt, safeEncrypt, findByEncryptedField } from '../utils/encryption-helpers';

// Import middleware
import { isAuthenticated } from '../middleware/auth';


/**
 * Helper: Decrypt comments field
 * Returns plaintext string from AES-256-GCM encrypted data
 */
function decryptCommentsField(comments: any): string {
    if (!comments) {
        return '';
    }
    
    if (typeof comments === 'object' && comments.encrypted) {
        try {
            return decryptField(comments as EncryptedData);
        } catch (error) {
            console.error('Failed to decrypt comments:', error);
            return '[Decryption failed - invalid key or corrupted data]';
        }
    }
    
    return '';
}

const router: Router = Router();

// ==================== ADMIN AUTH ROUTES ====================

// Check if admin is authenticated
router.get('/admin/check-auth', (req: IRequest, res: Response): void => {
    res.json({ 
        authenticated: !!req.session.adminId,
        admin: req.session.adminId ? {
            id: req.session.adminId,
            username: req.session.username
        } : null
    });
});

// Test endpoint - Get students for automated testing (no auth required)
// This endpoint is specifically for test automation scripts
router.get('/test/students', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
        
        // Fetch all students (cannot sort by encrypted field in database)
        const students = await Student.find().select('student_number');
        
        // Decrypt and prepare students for response
        const decryptedStudents = students.map(s => ({
            student_number: safeDecrypt(s.student_number),
            _id: s._id
        }));
        
        // Sort by student_number in memory (after decryption)
        decryptedStudents.sort((a, b) => {
            return a.student_number.localeCompare(b.student_number, undefined, { numeric: true });
        });
        
        // Apply limit if specified
        const result = limit && limit > 0 
            ? decryptedStudents.slice(0, limit) 
            : decryptedStudents;
        
        // Return only student_number (exclude _id)
        res.json(result.map(({ student_number }) => ({ 
            student_number
        })));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students for testing' });
    }
});

// Admin Login
router.post('/admin/login', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;
        
        // Find admin by encrypted username field
        // Must fetch and decrypt because username is encrypted at rest
        const admin = await findByEncryptedField<typeof Admin.prototype>(
            Admin, 
            'username', 
            username
        );
        
        if (!admin) {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
            return;
        }
        
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (!isValid) {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
            return;
        }
        
        // Update last login
        admin.last_login = new Date();
        await admin.save();
        
        // Set session
        req.session.adminId = admin._id.toString();
        req.session.username = safeDecrypt(admin.username);
        req.session.fullName = safeDecrypt(admin.full_name);
        
        // Save session with retry mechanism (helps during parallel testing)
        const saveSession = (retries = 3): void => {
            req.session.save((err?: Error) => {
                if (err) {
                    console.error(`Admin session save error (${4 - retries}/3 attempts):`, err.message);
                    if (retries > 1) {
                        // Retry after 100ms delay
                        setTimeout(() => saveSession(retries - 1), 100);
                        return;
                    }
                    res.status(500).json({ 
                        success: false, 
                        message: 'Session initialization failed. Please try again.' 
                    });
                    return;
                }
                res.json({ 
                    success: true, 
                    admin: { 
                        id: admin._id, 
                        username: safeDecrypt(admin.username),
                        fullName: safeDecrypt(admin.full_name)
                    } 
                });
            });
        };
        saveSession();
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred during login' 
        });
    }
});

// ==================== STUDENT ROUTES ====================

// Check if student is authenticated
router.get('/student/check-auth', (req: IRequest, res: Response): void => {
    res.json({ 
        authenticated: !!req.session.studentId,
        student: req.session.studentId ? {
            id: req.session.studentId
        } : null
    });
});

// Student Login
router.post('/student/login', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { student_number } = req.body;
        
        if (!student_number) {
            res.status(400).json({ 
                success: false, 
                message: 'Please enter your School ID' 
            });
            return;
        }
        
        // Find student by encrypted student_number field
        // Must fetch and decrypt because student_number is encrypted at rest
        const student = await findByEncryptedField<typeof Student.prototype>(
            Student, 
            'student_number', 
            student_number
        );
        
        // Populate program_id after finding the student
        if (student) {
            await student.populate('program_id');
        }
        
        if (!student) {
            res.status(404).json({ 
                success: false, 
                message: 'School ID not found. Please check your ID and try again.' 
            });
            return;
        }
        
        // Store ONLY student ObjectId in session (never student_number for privacy)
        req.session.studentId = student._id.toString();
        
        // Save session with retry mechanism (helps during parallel testing)
        const saveSession = (retries = 3): void => {
            req.session.save((err?: Error) => {
                if (err) {
                    console.error(`Session save error (${4 - retries}/3 attempts):`, err.message);
                    if (retries > 1) {
                        // Retry after 100ms delay
                        setTimeout(() => saveSession(retries - 1), 100);
                        return;
                    }
                    res.status(500).json({ 
                        success: false, 
                        message: 'Session initialization failed. Please try again.' 
                    });
                    return;
                }
                res.json({ success: true });
            });
        };
        saveSession();
    } catch (error) {
        console.error('Error during student login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again.' 
        });
    }
});

// Get student subjects/enrollments
router.get('/student/subjects', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.studentId) {
            res.json({ authenticated: false });
            return;
        }
        
        const student = await Student.findById(req.session.studentId).populate('program_id');
        
        if (!student) {
            res.json({ authenticated: false });
            return;
        }
        
        const enrollments = await Enrollment.find({ student_id: student._id })
            .populate('course_id')
            .populate('teacher_id');
        
        // Decrypt enrollment and populated fields
        const decryptedEnrollments = enrollments.map(e => {
            const enrollment = e.toObject();
            
            // Decrypt enrollment fields
            const decryptedEnrollment: any = {
                ...enrollment,
                section_code: safeDecrypt(enrollment.section_code),
                school_year: safeDecrypt(enrollment.school_year),
                semester: safeDecrypt(enrollment.semester)
            };
            
            // Decrypt populated course fields
            if (enrollment.course_id) {
                decryptedEnrollment.course_id = {
                    ...enrollment.course_id,
                    name: safeDecrypt((enrollment.course_id as any).name),
                    code: safeDecrypt((enrollment.course_id as any).code)
                };
            }
            
            // Decrypt populated teacher fields
            if (enrollment.teacher_id) {
                decryptedEnrollment.teacher_id = {
                    ...enrollment.teacher_id,
                    full_name: safeDecrypt((enrollment.teacher_id as any).full_name),
                    employee_id: safeDecrypt((enrollment.teacher_id as any).employee_id),
                    email: safeDecrypt((enrollment.teacher_id as any).email),
                    department: safeDecrypt((enrollment.teacher_id as any).department),
                    status: safeDecrypt((enrollment.teacher_id as any).status)
                };
            }
            
            return decryptedEnrollment;
        });
        
        // Sort by course name in memory (after decryption)
        decryptedEnrollments.sort((a, b) => {
            const nameA = a.course_id?.name || '';
            const nameB = b.course_id?.name || '';
            return nameA.localeCompare(nameB);
        });
        
        // Decrypt populated program for student
        const studentObj = student.toObject();
        const decryptedProgram = studentObj.program_id ? {
            ...studentObj.program_id,
            name: safeDecrypt((studentObj.program_id as any).name),
            code: safeDecrypt((studentObj.program_id as any).code)
        } : studentObj.program_id;
        
        res.json({ 
            authenticated: true,
            student: {
                program: decryptedProgram,
                year_level: safeDecrypt(student.year_level)
            },
            enrollments: decryptedEnrollments.map(e => ({
                _id: e._id,
                has_evaluated: e.has_evaluated,
                course: e.course_id,
                teacher: e.teacher_id,
                school_year: e.school_year,
                semester: e.semester,
                section_code: e.section_code
            }))
        });
    } catch (error) {
        console.error('Error loading student subjects:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading subjects' 
        });
    }
});

// Get enrollment details for evaluation
router.get('/student/enrollment/:enrollmentId', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.studentId) {
            res.json({ success: false, message: 'Please login first' });
            return;
        }
        
        const enrollment = await Enrollment.findById(req.params.enrollmentId)
            .populate('student_id')
            .populate({
                path: 'course_id',
                populate: { path: 'program_id' }
            })
            .populate('teacher_id');
        
        if (!enrollment) {
            res.json({ success: false, message: 'Enrollment not found' });
            return;
        }
        
        // Verify enrollment belongs to logged-in student
        if (enrollment.student_id._id.toString() !== req.session.studentId) {
            res.json({ success: false, message: 'Unauthorized access' });
            return;
        }
        
        if (enrollment.has_evaluated) {
            res.json({ success: false, message: 'You have already evaluated this subject' });
            return;
        }
        
        // Decrypt enrollment and populated fields for student viewing
        const enrollmentObj = enrollment.toObject();
        
        // Decrypt course fields (including nested program)
        const course = enrollmentObj.course_id ? {
            ...enrollmentObj.course_id,
            name: safeDecrypt((enrollmentObj.course_id as any).name),
            code: safeDecrypt((enrollmentObj.course_id as any).code),
            program_id: (enrollmentObj.course_id as any).program_id ? {
                ...(enrollmentObj.course_id as any).program_id,
                name: safeDecrypt(((enrollmentObj.course_id as any).program_id as any).name),
                code: safeDecrypt(((enrollmentObj.course_id as any).program_id as any).code)
            } : (enrollmentObj.course_id as any).program_id
        } : enrollmentObj.course_id;
        
        // Decrypt teacher fields
        const teacher = enrollmentObj.teacher_id ? {
            ...enrollmentObj.teacher_id,
            full_name: safeDecrypt((enrollmentObj.teacher_id as any).full_name),
            employee_id: safeDecrypt((enrollmentObj.teacher_id as any).employee_id),
            email: safeDecrypt((enrollmentObj.teacher_id as any).email),
            department: safeDecrypt((enrollmentObj.teacher_id as any).department),
            status: safeDecrypt((enrollmentObj.teacher_id as any).status)
        } : enrollmentObj.teacher_id;
        
        res.json({ 
            success: true,
            enrollment: {
                _id: enrollment._id,
                course,
                teacher,
                has_evaluated: enrollment.has_evaluated,
                section_code: safeDecrypt(enrollmentObj.section_code),
                school_year: safeDecrypt(enrollmentObj.school_year),
                semester: safeDecrypt(enrollmentObj.semester)
            }
        });
    } catch (error) {
        console.error('Error loading enrollment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading enrollment data' 
        });
    }
});

// Submit student evaluation
router.post('/student/submit-evaluation', async (req: IRequest, res: Response): Promise<void> => {
    try {
        if (!req.session.studentId) {
            res.status(401).json({ 
                success: false, 
                message: 'Please login first' 
            });
            return;
        }
        
        // PRIVACY PROTECTION: Add random delay
        const submissionDelay = PrivacyProtection.calculateSubmissionDelay(2, 8);
        await new Promise(resolve => setTimeout(resolve, submissionDelay));
        
        const data = req.body;
        
        // LAYER 10: Validate anonymous submission data
        const validationResult = PrivacyProtection.validateAnonymousSubmission(data);
        if (!validationResult.isValid) {
            res.status(400).json({
                success: false,
                message: validationResult.errors.join('. '),
                privacyViolation: true
            });
            return;
        }
        
        // Validate enrollment
        const enrollment = await Enrollment.findById(data.enrollment_id)
            .populate('student_id')
            .populate('course_id')
            .populate('teacher_id');
        
        if (!enrollment) {
            res.status(404).json({ 
                success: false, 
                message: 'Enrollment not found' 
            });
            return;
        }
        
        // Verify enrollment belongs to logged-in student
        if (enrollment.student_id._id.toString() !== req.session.studentId) {
            res.status(403).json({ 
                success: false, 
                message: 'Unauthorized access' 
            });
            return;
        }
        
        if (enrollment.has_evaluated) {
            res.status(400).json({ 
                success: false, 
                message: 'You have already evaluated this subject' 
            });
            return;
        }
        
        // PRIVACY PROTECTION
        const rawIp = req.headers['x-forwarded-for'] || 
                     req.socket.remoteAddress ||
                     req.ip;
        const anonymizedIp = PrivacyProtection.anonymizeIpAddress(rawIp);
        const anonymousToken = PrivacyProtection.generateAnonymousToken(enrollment);
        const safeTimestamp = PrivacyProtection.getSafeSubmissionTimestamp();
        
        // Type guard for populated student
        const populatedStudent = enrollment.student_id as IEnrollment['student_id'] & { program_id: Types.ObjectId; year_level: string; status: string; };
        
        // FIELD-LEVEL ENCRYPTION: Encrypt comments at rest (AES-256-GCM)
        let encryptedComments: EncryptedData | string = '';
        if (data.comments && data.comments.trim()) {
            if (!isEncryptionConfigured()) {
                console.error('CRITICAL: ENCRYPTION_MASTER_KEY not configured! Refusing to store plaintext comments.');
                res.status(500).json({
                    success: false,
                    message: 'Server configuration error. Please contact administrator.'
                });
                return;
            }
            
            // LAYER 12: Stylometric protection — sanitize before encryption
            const sanitizationResult = PrivacyProtection.sanitizeCommentForAnonymity(data.comments);
            if (!sanitizationResult.valid) {
                res.status(400).json({
                    success: false,
                    message: sanitizationResult.error || 'Comment validation failed'
                });
                return;
            }
            
            // Only encrypt if sanitized comment is not empty
            if (sanitizationResult.sanitized) {
                try {
                    encryptedComments = encryptField(sanitizationResult.sanitized);
                } catch (error) {
                    console.error('Comment encryption failed:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Evaluation processing error. Please try again.'
                    });
                    return;
                }
            }
        }
        
        // Create evaluation (stored completely separately, no link to enrollment)
        await Evaluation.create({
            school_year: enrollment.school_year,
            anonymous_token: anonymousToken,
            program_id: populatedStudent.program_id,
            year_level: populatedStudent.year_level,
            status: populatedStudent.status,
            course_id: (enrollment.course_id as any)._id,
            teacher_id: (enrollment.teacher_id as any)._id,
            
            // Teacher ratings (6 criteria)
            teacher_diction: Number(data.teacher_diction),
            teacher_grammar: Number(data.teacher_grammar),
            teacher_personality: Number(data.teacher_personality),
            teacher_disposition: Number(data.teacher_disposition),
            teacher_dynamic: Number(data.teacher_dynamic),
            teacher_fairness: Number(data.teacher_fairness),
            
            // Learning process ratings (13 criteria)
            learning_motivation: Number(data.learning_motivation),
            learning_critical_thinking: Number(data.learning_critical_thinking),
            learning_organization: Number(data.learning_organization),
            learning_interest: Number(data.learning_interest),
            learning_explanation: Number(data.learning_explanation),
            learning_clarity: Number(data.learning_clarity),
            learning_integration: Number(data.learning_integration),
            learning_mastery: Number(data.learning_mastery),
            learning_methodology: Number(data.learning_methodology),
            learning_values: Number(data.learning_values),
            learning_grading: Number(data.learning_grading),
            learning_synthesis: Number(data.learning_synthesis),
            learning_reasonableness: Number(data.learning_reasonableness),
            
            // Classroom management ratings (6 criteria)
            classroom_attendance: Number(data.classroom_attendance),
            classroom_policies: Number(data.classroom_policies),
            classroom_discipline: Number(data.classroom_discipline),
            classroom_authority: Number(data.classroom_authority),
            classroom_prayers: Number(data.classroom_prayers),
            classroom_punctuality: Number(data.classroom_punctuality),
            
            comments: encryptedComments, // Encrypted at rest (AES-256-GCM)
            ip_address: anonymizedIp,
            submitted_at: safeTimestamp
        });
        
        // Generate receipt hash for student verification (no reversible link)
        const receiptHash = PrivacyProtection.generateReceiptHash(
            anonymousToken,
            safeTimestamp
        );
        
        // Update enrollment - mark as used WITHOUT linking evaluation ID
        enrollment.has_evaluated = true;
        enrollment.submission_token_used = true;
        enrollment.receipt_hash = receiptHash;
        // NO evaluation_id stored - complete structural unlinkability ✅
        await enrollment.save();
        
        // PRIVACY PROTECTION: Clear session data
        PrivacyProtection.clearSensitiveSessionData(req.session);
        
        res.json({ 
            success: true, 
            message: 'Evaluation submitted successfully!',
            receipt: receiptHash // Give student verification receipt
        });
        
    } catch (error) {
        console.error('Error submitting evaluation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting evaluation. Please try again.' 
        });
    }
});

// ==================== ADMIN DASHBOARD ====================

router.get('/admin/dashboard', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        const totalEvaluations = await Evaluation.countDocuments();
        const totalTeachers = await Teacher.countDocuments({ status: 'active' });
        const totalPrograms = await Program.countDocuments();
        
        // Calculate average ratings
        const avgRatings = await Evaluation.aggregate([
            {
                $addFields: {
                    teacher_avg: {
                        $avg: [
                            '$teacher_diction', '$teacher_grammar', '$teacher_personality',
                            '$teacher_disposition', '$teacher_dynamic', '$teacher_fairness'
                        ]
                    },
                    learning_avg: {
                        $avg: [
                            '$learning_motivation', '$learning_critical_thinking', '$learning_organization',
                            '$learning_interest', '$learning_explanation', '$learning_clarity',
                            '$learning_integration', '$learning_mastery', '$learning_methodology',
                            '$learning_values', '$learning_grading', '$learning_synthesis', '$learning_reasonableness'
                        ]
                    },
                    classroom_avg: {
                        $avg: [
                            '$classroom_attendance', '$classroom_policies', '$classroom_discipline',
                            '$classroom_authority', '$classroom_prayers', '$classroom_punctuality'
                        ]
                    }
                }
            },
            {
                $addFields: {
                    overall_avg: { $avg: ['$teacher_avg', '$learning_avg', '$classroom_avg'] }
                }
            },
            {
                $group: {
                    _id: null,
                    teacher: { $avg: '$teacher_avg' },
                    learning: { $avg: '$learning_avg' },
                    classroom: { $avg: '$classroom_avg' },
                    overall: { $avg: '$overall_avg' }
                }
            }
        ]);
        
        // Use actual ratings without any privacy noise
        const averageRatings = avgRatings.length > 0 ? avgRatings[0] : 
            { teacher: 0, learning: 0, classroom: 0, overall: 0 };
        
        // Top teachers
        const topTeachersRaw = await Evaluation.aggregate([
            {
                $addFields: {
                    teacher_avg: {
                        $avg: [
                            '$teacher_diction', '$teacher_grammar', '$teacher_personality',
                            '$teacher_disposition', '$teacher_dynamic', '$teacher_fairness'
                        ]
                    },
                    learning_avg: {
                        $avg: [
                            '$learning_motivation', '$learning_critical_thinking', '$learning_organization',
                            '$learning_interest', '$learning_explanation', '$learning_clarity',
                            '$learning_integration', '$learning_mastery', '$learning_methodology',
                            '$learning_values', '$learning_grading', '$learning_synthesis', '$learning_reasonableness'
                        ]
                    },
                    classroom_avg: {
                        $avg: [
                            '$classroom_attendance', '$classroom_policies', '$classroom_discipline',
                            '$classroom_authority', '$classroom_prayers', '$classroom_punctuality'
                        ]
                    }
                }
            },
            {
                $addFields: {
                    overall_avg: { $avg: ['$teacher_avg', '$learning_avg', '$classroom_avg'] }
                }
            },
            {
                $group: {
                    _id: '$teacher_id',
                    average_rating: { $avg: '$overall_avg' },
                    evaluation_count: { $sum: 1 }
                }
            },
            // Admin view: Show all teachers with at least 1 evaluation
            { $match: { evaluation_count: { $gte: 1 } } },
            { $sort: { average_rating: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'teachers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $project: {
                    _id: '$teacher._id',
                    full_name: '$teacher.full_name', // Still encrypted at this stage
                    average_rating: 1,
                    evaluation_count: 1
                }
            }
        ]);
        
        // Decrypt teacher names for admin viewing
        const topTeachers = topTeachersRaw.map((teacher: any) => ({
            ...teacher,
            full_name: safeDecrypt(teacher.full_name)
        }));
        
        // Recent evaluations
        const recentEvaluationsRaw = await Evaluation.find()
            .populate('teacher_id', 'full_name')
            .populate('course_id', 'name code')
            .sort({ createdAt: -1 })
            .limit(10)
            .select('-anonymous_token -ip_address')
            .lean();
        
        // Transform to match frontend expectation (teacher, course instead of teacher_id, course_id)
        const recentEvaluations = recentEvaluationsRaw.map((evaluation: any) => {
            // Calculate averages (virtuals not available with .lean())
            const teacher_average = (
                evaluation.teacher_diction +
                evaluation.teacher_grammar +
                evaluation.teacher_personality +
                evaluation.teacher_disposition +
                evaluation.teacher_dynamic +
                evaluation.teacher_fairness
            ) / 6;
            
            const learning_average = (
                evaluation.learning_motivation +
                evaluation.learning_critical_thinking +
                evaluation.learning_organization +
                evaluation.learning_interest +
                evaluation.learning_explanation +
                evaluation.learning_clarity +
                evaluation.learning_integration +
                evaluation.learning_mastery +
                evaluation.learning_methodology +
                evaluation.learning_values +
                evaluation.learning_grading +
                evaluation.learning_synthesis +
                evaluation.learning_reasonableness
            ) / 13;
            
            const classroom_average = (
                evaluation.classroom_attendance +
                evaluation.classroom_policies +
                evaluation.classroom_discipline +
                evaluation.classroom_authority +
                evaluation.classroom_prayers +
                evaluation.classroom_punctuality
            ) / 6;
            
            const overall_average = (teacher_average + learning_average + classroom_average) / 3;
            
            // Decrypt populated teacher fields
            const teacher = evaluation.teacher_id ? {
                _id: evaluation.teacher_id._id,
                full_name: safeDecrypt(evaluation.teacher_id.full_name)
            } : evaluation.teacher_id;
            
            // Decrypt populated course fields
            const course = evaluation.course_id ? {
                _id: evaluation.course_id._id,
                name: safeDecrypt(evaluation.course_id.name),
                code: safeDecrypt(evaluation.course_id.code)
            } : evaluation.course_id;
            
            return {
                ...evaluation,
                school_year: safeDecrypt(evaluation.school_year), // Decrypt Evaluation's own encrypted field
                year_level: safeDecrypt(evaluation.year_level),   // Decrypt Evaluation's own encrypted field
                status: safeDecrypt(evaluation.status),           // Decrypt Evaluation's own encrypted field
                comments: decryptCommentsField(evaluation.comments), // Decrypt for admin viewing
                teacher,
                course,
                teacher_id: evaluation.teacher_id?._id,
                course_id: evaluation.course_id?._id,
                teacher_average,
                learning_average,
                classroom_average,
                overall_average
            };
        });
        
        // Admin response
        res.json({
            totalEvaluations,
            totalTeachers,
            totalPrograms,
            averageRatings,
            topTeachers,
            recentEvaluations
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).json({ error: 'Error loading dashboard data' });
    }
});

// ==================== ADMIN EVALUATIONS ====================

router.get('/admin/evaluations', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        const evaluationsRaw = await Evaluation.find()
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .sort({ createdAt: -1 })
            .select('-anonymous_token -ip_address')
            .lean();
        
        // Transform to match frontend expectation
        const evaluations = evaluationsRaw.map((evaluation: any) => {
            // Calculate averages (virtuals not available with .lean())
            const teacher_average = (
                evaluation.teacher_diction +
                evaluation.teacher_grammar +
                evaluation.teacher_personality +
                evaluation.teacher_disposition +
                evaluation.teacher_dynamic +
                evaluation.teacher_fairness
            ) / 6;
            
            const learning_average = (
                evaluation.learning_motivation +
                evaluation.learning_critical_thinking +
                evaluation.learning_organization +
                evaluation.learning_interest +
                evaluation.learning_explanation +
                evaluation.learning_clarity +
                evaluation.learning_integration +
                evaluation.learning_mastery +
                evaluation.learning_methodology +
                evaluation.learning_values +
                evaluation.learning_grading +
                evaluation.learning_synthesis +
                evaluation.learning_reasonableness
            ) / 13;
            
            const classroom_average = (
                evaluation.classroom_attendance +
                evaluation.classroom_policies +
                evaluation.classroom_discipline +
                evaluation.classroom_authority +
                evaluation.classroom_prayers +
                evaluation.classroom_punctuality
            ) / 6;
            
            const overall_average = (teacher_average + learning_average + classroom_average) / 3;
            
            // Decrypt populated fields for admin viewing
            const teacher = evaluation.teacher_id ? {
                _id: evaluation.teacher_id._id,
                full_name: safeDecrypt(evaluation.teacher_id.full_name),
                employee_id: safeDecrypt(evaluation.teacher_id.employee_id)
            } : evaluation.teacher_id;
            
            const course = evaluation.course_id ? {
                _id: evaluation.course_id._id,
                name: safeDecrypt(evaluation.course_id.name),
                code: safeDecrypt(evaluation.course_id.code)
            } : evaluation.course_id;
            
            const program = evaluation.program_id ? {
                _id: evaluation.program_id._id,
                name: safeDecrypt(evaluation.program_id.name)
            } : evaluation.program_id;
            
            return {
                ...evaluation,
                school_year: safeDecrypt(evaluation.school_year), // Decrypt Evaluation's own encrypted field
                year_level: safeDecrypt(evaluation.year_level),   // Decrypt Evaluation's own encrypted field
                status: safeDecrypt(evaluation.status),           // Decrypt Evaluation's own encrypted field
                comments: decryptCommentsField(evaluation.comments), // Decrypt for admin viewing
                teacher,
                course,
                program,
                teacher_id: evaluation.teacher_id?._id,
                course_id: evaluation.course_id?._id,
                program_id: evaluation.program_id?._id,
                teacher_average,
                learning_average,
                classroom_average,
                overall_average
            };
        });
        
        res.json({ evaluations });
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: 'Error fetching evaluations' });
    }
});

router.get('/admin/evaluations/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const evaluationRaw = await Evaluation.findById(req.params.id)
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .select('-anonymous_token -ip_address')
            .lean();
        
        if (!evaluationRaw) {
            res.status(404).json({ error: 'Evaluation not found' });
            return;
        }
        
        // Decrypt populated fields for admin viewing
        const teacher = evaluationRaw.teacher_id ? {
            _id: (evaluationRaw.teacher_id as any)._id,
            full_name: safeDecrypt((evaluationRaw.teacher_id as any).full_name),
            employee_id: safeDecrypt((evaluationRaw.teacher_id as any).employee_id)
        } : evaluationRaw.teacher_id;
        
        const course = evaluationRaw.course_id ? {
            _id: (evaluationRaw.course_id as any)._id,
            name: safeDecrypt((evaluationRaw.course_id as any).name),
            code: safeDecrypt((evaluationRaw.course_id as any).code)
        } : evaluationRaw.course_id;
        
        const program = evaluationRaw.program_id ? {
            _id: (evaluationRaw.program_id as any)._id,
            name: safeDecrypt((evaluationRaw.program_id as any).name)
        } : evaluationRaw.program_id;
        
        // Transform to match frontend expectation
        // Calculate averages (virtuals not available with .lean())
        const teacher_average = (
            (evaluationRaw as any).teacher_diction +
            (evaluationRaw as any).teacher_grammar +
            (evaluationRaw as any).teacher_personality +
            (evaluationRaw as any).teacher_disposition +
            (evaluationRaw as any).teacher_dynamic +
            (evaluationRaw as any).teacher_fairness
        ) / 6;
        
        const learning_average = (
            (evaluationRaw as any).learning_motivation +
            (evaluationRaw as any).learning_critical_thinking +
            (evaluationRaw as any).learning_organization +
            (evaluationRaw as any).learning_interest +
            (evaluationRaw as any).learning_explanation +
            (evaluationRaw as any).learning_clarity +
            (evaluationRaw as any).learning_integration +
            (evaluationRaw as any).learning_mastery +
            (evaluationRaw as any).learning_methodology +
            (evaluationRaw as any).learning_values +
            (evaluationRaw as any).learning_grading +
            (evaluationRaw as any).learning_synthesis +
            (evaluationRaw as any).learning_reasonableness
        ) / 13;
        
        const classroom_average = (
            (evaluationRaw as any).classroom_attendance +
            (evaluationRaw as any).classroom_policies +
            (evaluationRaw as any).classroom_discipline +
            (evaluationRaw as any).classroom_authority +
            (evaluationRaw as any).classroom_prayers +
            (evaluationRaw as any).classroom_punctuality
        ) / 6;
        
        const overall_average = (teacher_average + learning_average + classroom_average) / 3;
        
        const evaluation = {
            ...evaluationRaw,
            school_year: safeDecrypt((evaluationRaw as any).school_year), // Decrypt Evaluation's own encrypted field
            year_level: safeDecrypt((evaluationRaw as any).year_level),   // Decrypt Evaluation's own encrypted field
            status: safeDecrypt((evaluationRaw as any).status),           // Decrypt Evaluation's own encrypted field
            comments: decryptCommentsField((evaluationRaw as any).comments), // Decrypt for admin viewing
            teacher, // Use decrypted teacher
            course,  // Use decrypted course
            program, // Use decrypted program
            teacher_id: (evaluationRaw as any).teacher_id?._id,
            course_id: (evaluationRaw as any).course_id?._id,
            program_id: (evaluationRaw as any).program_id?._id,
            teacher_average,
            learning_average,
            classroom_average,
            overall_average
        };
        
        res.json({ evaluation });
    } catch (error) {
        console.error('Error fetching evaluation:', error);
        res.status(500).json({ error: 'Error fetching evaluation' });
    }
});

// ==================== ADMIN CRUD ROUTES ====================

// Teachers
router.get('/admin/teachers', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        // Fetch all teachers (cannot sort by encrypted field in database)
        const teachersRaw = await Teacher.find();
        
        // Decrypt fields and prepare for admin viewing
        const teachers = teachersRaw.map(t => {
            const teacher = t.toObject();
            return {
                ...teacher,
                full_name: safeDecrypt(teacher.full_name),
                employee_id: safeDecrypt(teacher.employee_id),
                email: safeDecrypt(teacher.email),
                department: safeDecrypt(teacher.department),
                status: safeDecrypt(teacher.status)
            };
        });
        
        // Sort by full_name in memory (after decryption)
        teachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
        
        res.json({ teachers });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching teachers' });
    }
});

router.post('/admin/teachers', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const teacherData = {
            ...req.body,
            full_name: safeEncrypt(req.body.full_name),
            employee_id: safeEncrypt(req.body.employee_id),
            email: safeEncrypt(req.body.email),
            department: safeEncrypt(req.body.department),
            status: safeEncrypt(req.body.status)
        };
        const teacher = await Teacher.create(teacherData);
        
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: safeDecrypt(teacher.full_name),
            employee_id: safeDecrypt(teacher.employee_id),
            email: safeDecrypt(teacher.email),
            department: safeDecrypt(teacher.department),
            status: safeDecrypt(teacher.status)
        };
        
        res.json({ success: true, teacher: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/teachers/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const teacherData = {
            ...req.body,
            full_name: safeEncrypt(req.body.full_name),
            employee_id: safeEncrypt(req.body.employee_id),
            email: safeEncrypt(req.body.email),
            department: safeEncrypt(req.body.department),
            status: safeEncrypt(req.body.status)
        };
        const teacher = await Teacher.findByIdAndUpdate(req.params.id, teacherData, { new: true });
        
        if (!teacher) {
            res.status(404).json({ message: 'Teacher not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: safeDecrypt(teacher.full_name),
            employee_id: safeDecrypt(teacher.employee_id),
            email: safeDecrypt(teacher.email),
            department: safeDecrypt(teacher.department),
            status: safeDecrypt(teacher.status)
        };
        
        res.json({ success: true, teacher: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/admin/teachers/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Teacher.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

// Programs
router.get('/admin/programs', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        // Fetch all programs (cannot sort by encrypted field in database)
        const programsRaw = await Program.find();
        
        // Decrypt fields and prepare for admin viewing
        const programs = programsRaw.map(p => {
            const program = p.toObject();
            return {
                ...program,
                name: safeDecrypt(program.name),
                code: safeDecrypt(program.code)
            };
        });
        
        // Sort by name in memory (after decryption)
        programs.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json({ programs });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching programs' });
    }
});

router.post('/admin/programs', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const programData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const program = await Program.create(programData);
        
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: safeDecrypt(program.name),
            code: safeDecrypt(program.code)
        };
        
        res.json({ success: true, program: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/programs/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const programData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const program = await Program.findByIdAndUpdate(req.params.id, programData, { new: true });
        
        if (!program) {
            res.status(404).json({ message: 'Program not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: safeDecrypt(program.name),
            code: safeDecrypt(program.code)
        };
        
        res.json({ success: true, program: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/admin/programs/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Program.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

// Courses
router.get('/admin/courses', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        // Fetch all courses (cannot sort by encrypted field in database)
        const coursesRaw = await Course.find().populate('program_id');
        
        // Decrypt fields and prepare for admin viewing
        const courses = coursesRaw.map(c => {
            const course = c.toObject();
            // Also decrypt populated program fields
            const program = course.program_id ? {
                ...course.program_id,
                name: safeDecrypt((course.program_id as any).name),
                code: safeDecrypt((course.program_id as any).code)
            } : course.program_id;
            
            return {
                ...course,
                name: safeDecrypt(course.name),
                code: safeDecrypt(course.code),
                program_id: program
            };
        });
        
        // Sort by name in memory (after decryption)
        courses.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json({ courses });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching courses' });
    }
});

router.post('/admin/courses', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const courseData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const course = await Course.create(courseData);
        
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: safeDecrypt(course.name),
            code: safeDecrypt(course.code)
        };
        
        res.json({ success: true, course: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/courses/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const courseData = {
            ...req.body,
            name: safeEncrypt(req.body.name),
            code: safeEncrypt(req.body.code)
        };
        const course = await Course.findByIdAndUpdate(req.params.id, courseData, { new: true });
        
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: safeDecrypt(course.name),
            code: safeDecrypt(course.code)
        };
        
        res.json({ success: true, course: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/admin/courses/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

// Students
router.get('/admin/students', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        // Fetch all students (cannot sort by encrypted field in database)
        const studentsRaw = await Student.find().populate('program_id');
        
        // Decrypt fields and prepare for admin viewing
        const students = studentsRaw.map(s => {
            const student = s.toObject();
            // Also decrypt populated program fields
            const program = student.program_id ? {
                ...student.program_id,
                name: safeDecrypt((student.program_id as any).name),
                code: safeDecrypt((student.program_id as any).code)
            } : student.program_id;
            
            return {
                ...student,
                student_number: safeDecrypt(student.student_number),
                year_level: safeDecrypt(student.year_level),
                section: safeDecrypt(student.section),
                status: safeDecrypt(student.status),
                program_id: program
            };
        });
        
        // Sort by student_number in memory (after decryption)
        students.sort((a, b) => a.student_number.localeCompare(b.student_number, undefined, { numeric: true }));
        
        res.json({ students });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});

router.post('/admin/students', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before saving
        const studentData = {
            ...req.body,
            student_number: safeEncrypt(req.body.student_number),
            year_level: safeEncrypt(req.body.year_level),
            section: safeEncrypt(req.body.section),
            status: safeEncrypt(req.body.status)
        };
        const student = await Student.create(studentData);
        
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: safeDecrypt(student.student_number),
            year_level: safeDecrypt(student.year_level),
            section: safeDecrypt(student.section),
            status: safeDecrypt(student.status)
        };
        
        res.json({ success: true, student: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/students/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        // Encrypt fields before updating
        const studentData = {
            ...req.body,
            student_number: safeEncrypt(req.body.student_number),
            year_level: safeEncrypt(req.body.year_level),
            section: safeEncrypt(req.body.section),
            status: safeEncrypt(req.body.status)
        };
        const student = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true });
        
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: safeDecrypt(student.student_number),
            year_level: safeDecrypt(student.year_level),
            section: safeDecrypt(student.section),
            status: safeDecrypt(student.status)
        };
        
        res.json({ success: true, student: response });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.delete('/admin/students/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

// Privacy Audit
router.post('/admin/privacy-audit/run', isAuthenticated, async (_req: IRequest, res: Response): Promise<void> => {
    try {
        const { runPrivacyAudit } = await import('../utils/privacy-audit');
        const auditReport = await runPrivacyAudit();
        
        // Transform AuditReport into DetailedAuditResults format expected by frontend
        const checks = [
            // Add issues as failed checks
            ...auditReport.issues.map(issue => ({
                name: issue.title,
                description: issue.description,
                passed: false,
                details: issue.recommendation
            })),
            // Add warnings as passed checks (INFO level warnings are informational, not failures)
            ...auditReport.warnings.map(warning => ({
                name: warning.title,
                description: warning.description,
                passed: warning.level === 'INFO',
                details: warning.recommendation
            }))
        ];
        
        const failed_checks = checks.filter(c => !c.passed).length;
        const passed_checks = checks.filter(c => c.passed).length;
        const total_checks = checks.length;
        
        // Transform issues into recommendations
        const recommendations = auditReport.issues.map(issue => ({
            priority: issue.severity === 'CRITICAL' ? 'high' as const : 'medium' as const,
            title: issue.title,
            description: issue.recommendation
        }));
        
        const results = {
            overall_compliance: auditReport.issues.length === 0,
            total_checks,
            passed_checks,
            failed_checks,
            checks,
            recommendations,
            timestamp: auditReport.timestamp
        };
        
        res.json({ results });
    } catch (error) {
        console.error('Error running privacy audit:', error);
        res.status(500).json({ error: 'Error running privacy audit' });
    }
});

export default router;
