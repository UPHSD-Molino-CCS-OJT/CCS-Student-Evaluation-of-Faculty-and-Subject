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

// Import middleware
import { isAuthenticated } from '../middleware/auth';

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
        
        let query = Student.find().select('student_number full_name').sort({ student_number: 1 });
        
        if (limit && limit > 0) {
            query = query.limit(limit);
        }
        
        const students = await query;
        
        res.json(students.map(s => ({
            student_number: s.student_number,
            full_name: s.full_name
        })));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students for testing' });
    }
});

// Admin Login
router.post('/admin/login', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;
        
        const admin = await Admin.findOne({ username });
        
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
        req.session.username = admin.username;
        req.session.fullName = admin.full_name;
        
        req.session.save((err?: Error) => {
            if (err) {
                console.error('Session save error:', err);
                res.status(500).json({ 
                    success: false, 
                    message: 'Session error' 
                });
                return;
            }
            res.json({ 
                success: true, 
                admin: { 
                    id: admin._id, 
                    username: admin.username,
                    fullName: admin.full_name 
                } 
            });
        });
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
        
        const student = await Student.findOne({ student_number }).populate('program_id');
        
        if (!student) {
            res.status(404).json({ 
                success: false, 
                message: 'School ID not found. Please check your ID and try again.' 
            });
            return;
        }
        
        // Store ONLY student ObjectId in session (never student_number for privacy)
        req.session.studentId = student._id.toString();
        
        req.session.save((err?: Error) => {
            if (err) {
                res.status(500).json({ 
                    success: false, 
                    message: 'Session error' 
                });
                return;
            }
            res.json({ success: true });
        });
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
            .populate('teacher_id')
            .sort({ 'course_id.name': 1 });
        
        res.json({ 
            authenticated: true,
            student: {
                full_name: student.full_name,
                program: student.program_id,
                year_level: student.year_level
            },
            enrollments: enrollments.map(e => ({
                _id: e._id,
                has_evaluated: e.has_evaluated,
                course: e.course_id,
                teacher: e.teacher_id,
                school_year: e.school_year,
                semester: e.semester
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
        
        res.json({ 
            success: true,
            enrollment: {
                _id: enrollment._id,
                course: enrollment.course_id,
                teacher: enrollment.teacher_id,
                has_evaluated: enrollment.has_evaluated
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
        
        // Create evaluation
        const evaluation = await Evaluation.create({
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
            
            comments: data.comments || '',
            ip_address: anonymizedIp,
            submitted_at: safeTimestamp
        });
        
        // Update enrollment
        enrollment.has_evaluated = true;
        enrollment.evaluation_id = evaluation._id;
        await enrollment.save();
        
        // PRIVACY PROTECTION: Clear session data
        PrivacyProtection.clearSensitiveSessionData(req.session);
        
        res.json({ 
            success: true, 
            message: 'Evaluation submitted successfully!' 
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
        
        const averageRatings = avgRatings.length > 0 ? {
            teacher: avgRatings[0].teacher || 0,
            learning: avgRatings[0].learning || 0,
            classroom: avgRatings[0].classroom || 0,
            overall: avgRatings[0].overall || 0
        } : { teacher: 0, learning: 0, classroom: 0, overall: 0 };
        
        // Top teachers
        const topTeachers = await Evaluation.aggregate([
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
                    full_name: '$teacher.full_name',
                    average_rating: 1,
                    evaluation_count: 1
                }
            }
        ]);
        
        // Recent evaluations (privacy protected - no student IDs)
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
            
            return {
                ...evaluation,
                teacher: evaluation.teacher_id,
                course: evaluation.course_id,
                teacher_id: evaluation.teacher_id?._id,
                course_id: evaluation.course_id?._id,
                teacher_average,
                learning_average,
                classroom_average,
                overall_average
            };
        });
        
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
            
            return {
                ...evaluation,
                teacher: evaluation.teacher_id,
                course: evaluation.course_id,
                program: evaluation.program_id,
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
            teacher: (evaluationRaw as any).teacher_id,
            course: (evaluationRaw as any).course_id,
            program: (evaluationRaw as any).program_id,
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
        const teachers = await Teacher.find().sort({ full_name: 1 });
        res.json({ teachers });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching teachers' });
    }
});

router.post('/admin/teachers', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const teacher = await Teacher.create(req.body);
        res.json({ success: true, teacher });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/teachers/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, teacher });
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
        const programs = await Program.find().sort({ name: 1 });
        res.json({ programs });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching programs' });
    }
});

router.post('/admin/programs', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const program = await Program.create(req.body);
        res.json({ success: true, program });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/programs/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, program });
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
        const courses = await Course.find().populate('program_id').sort({ name: 1 });
        res.json({ courses });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching courses' });
    }
});

router.post('/admin/courses', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const course = await Course.create(req.body);
        res.json({ success: true, course });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/courses/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, course });
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
        const students = await Student.find().populate('program_id').sort({ full_name: 1 });
        res.json({ students });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});

router.post('/admin/students', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const student = await Student.create(req.body);
        res.json({ success: true, student });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
});

router.put('/admin/students/:id', isAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, student });
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
