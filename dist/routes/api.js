"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Import Models
const Admin_1 = __importDefault(require("../models/Admin"));
const Program_1 = __importDefault(require("../models/Program"));
const Teacher_1 = __importDefault(require("../models/Teacher"));
const Course_1 = __importDefault(require("../models/Course"));
const Evaluation_1 = __importDefault(require("../models/Evaluation"));
const Student_1 = __importDefault(require("../models/Student"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
// Import Privacy Protection Utilities
const privacy_protection_1 = __importDefault(require("../utils/privacy-protection"));
const encryption_1 = require("../utils/encryption");
// Import middleware
const auth_1 = require("../middleware/auth");
// K-ANONYMITY THRESHOLD
// Minimum number of evaluations required before displaying aggregate statistics
// This ensures individual responses cannot be identified or inferred
const K_ANONYMITY_THRESHOLD = 5;
/**
 * Helper: Decrypt comments field
 * Returns plaintext string from AES-256-GCM encrypted data
 */
function decryptCommentsField(comments) {
    if (!comments) {
        return '';
    }
    if (typeof comments === 'object' && comments.encrypted) {
        try {
            return (0, encryption_1.decryptField)(comments);
        }
        catch (error) {
            console.error('Failed to decrypt comments:', error);
            return '[Decryption failed - invalid key or corrupted data]';
        }
    }
    return '';
}
const router = (0, express_1.Router)();
// ==================== ADMIN AUTH ROUTES ====================
// Check if admin is authenticated
router.get('/admin/check-auth', (req, res) => {
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
router.get('/test/students', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
        let query = Student_1.default.find().select('student_number full_name').sort({ student_number: 1 });
        if (limit && limit > 0) {
            query = query.limit(limit);
        }
        const students = await query;
        res.json(students.map(s => ({
            student_number: s.student_number,
            full_name: s.full_name
        })));
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching students for testing' });
    }
});
// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin_1.default.findOne({ username });
        if (!admin) {
            res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
            return;
        }
        const isValid = await bcrypt_1.default.compare(password, admin.password);
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
        // Save session with retry mechanism (helps during parallel testing)
        const saveSession = (retries = 3) => {
            req.session.save((err) => {
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
                        username: admin.username,
                        fullName: admin.full_name
                    }
                });
            });
        };
        saveSession();
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});
// ==================== STUDENT ROUTES ====================
// Check if student is authenticated
router.get('/student/check-auth', (req, res) => {
    res.json({
        authenticated: !!req.session.studentId,
        student: req.session.studentId ? {
            id: req.session.studentId
        } : null
    });
});
// Student Login
router.post('/student/login', async (req, res) => {
    try {
        const { student_number } = req.body;
        if (!student_number) {
            res.status(400).json({
                success: false,
                message: 'Please enter your School ID'
            });
            return;
        }
        const student = await Student_1.default.findOne({ student_number }).populate('program_id');
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
        const saveSession = (retries = 3) => {
            req.session.save((err) => {
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
    }
    catch (error) {
        console.error('Error during student login:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again.'
        });
    }
});
// Get student subjects/enrollments
router.get('/student/subjects', async (req, res) => {
    try {
        if (!req.session.studentId) {
            res.json({ authenticated: false });
            return;
        }
        const student = await Student_1.default.findById(req.session.studentId).populate('program_id');
        if (!student) {
            res.json({ authenticated: false });
            return;
        }
        const enrollments = await Enrollment_1.default.find({ student_id: student._id })
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
    }
    catch (error) {
        console.error('Error loading student subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading subjects'
        });
    }
});
// Get enrollment details for evaluation
router.get('/student/enrollment/:enrollmentId', async (req, res) => {
    try {
        if (!req.session.studentId) {
            res.json({ success: false, message: 'Please login first' });
            return;
        }
        const enrollment = await Enrollment_1.default.findById(req.params.enrollmentId)
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
    }
    catch (error) {
        console.error('Error loading enrollment:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading enrollment data'
        });
    }
});
// Submit student evaluation
router.post('/student/submit-evaluation', async (req, res) => {
    try {
        if (!req.session.studentId) {
            res.status(401).json({
                success: false,
                message: 'Please login first'
            });
            return;
        }
        // PRIVACY PROTECTION: Add random delay
        const submissionDelay = privacy_protection_1.default.calculateSubmissionDelay(2, 8);
        await new Promise(resolve => setTimeout(resolve, submissionDelay));
        const data = req.body;
        // LAYER 10: Validate anonymous submission data
        const validationResult = privacy_protection_1.default.validateAnonymousSubmission(data);
        if (!validationResult.isValid) {
            res.status(400).json({
                success: false,
                message: validationResult.errors.join('. '),
                privacyViolation: true
            });
            return;
        }
        // Validate enrollment
        const enrollment = await Enrollment_1.default.findById(data.enrollment_id)
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
        const anonymizedIp = privacy_protection_1.default.anonymizeIpAddress(rawIp);
        const anonymousToken = privacy_protection_1.default.generateAnonymousToken(enrollment);
        const safeTimestamp = privacy_protection_1.default.getSafeSubmissionTimestamp();
        // Type guard for populated student
        const populatedStudent = enrollment.student_id;
        // FIELD-LEVEL ENCRYPTION: Encrypt comments at rest (AES-256-GCM)
        let encryptedComments = '';
        if (data.comments && data.comments.trim()) {
            if (!(0, encryption_1.isEncryptionConfigured)()) {
                console.error('CRITICAL: ENCRYPTION_MASTER_KEY not configured! Refusing to store plaintext comments.');
                res.status(500).json({
                    success: false,
                    message: 'Server configuration error. Please contact administrator.'
                });
                return;
            }
            // LAYER 12: Stylometric protection — sanitize before encryption
            const sanitizationResult = privacy_protection_1.default.sanitizeCommentForAnonymity(data.comments);
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
                    encryptedComments = (0, encryption_1.encryptField)(sanitizationResult.sanitized);
                }
                catch (error) {
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
        await Evaluation_1.default.create({
            school_year: enrollment.school_year,
            anonymous_token: anonymousToken,
            program_id: populatedStudent.program_id,
            year_level: populatedStudent.year_level,
            status: populatedStudent.status,
            course_id: enrollment.course_id._id,
            teacher_id: enrollment.teacher_id._id,
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
        const receiptHash = privacy_protection_1.default.generateReceiptHash(anonymousToken, safeTimestamp);
        // Update enrollment - mark as used WITHOUT linking evaluation ID
        enrollment.has_evaluated = true;
        enrollment.submission_token_used = true;
        enrollment.receipt_hash = receiptHash;
        // NO evaluation_id stored - complete structural unlinkability ✅
        await enrollment.save();
        // PRIVACY PROTECTION: Clear session data
        privacy_protection_1.default.clearSensitiveSessionData(req.session);
        res.json({
            success: true,
            message: 'Evaluation submitted successfully!',
            receipt: receiptHash // Give student verification receipt
        });
    }
    catch (error) {
        console.error('Error submitting evaluation:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting evaluation. Please try again.'
        });
    }
});
// ==================== ADMIN DASHBOARD ====================
router.get('/admin/dashboard', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const totalEvaluations = await Evaluation_1.default.countDocuments();
        const totalTeachers = await Teacher_1.default.countDocuments({ status: 'active' });
        const totalPrograms = await Program_1.default.countDocuments();
        // K-ANONYMITY CHECK: Ensure minimum group size for privacy protection
        if (!privacy_protection_1.default.checkKAnonymity(totalEvaluations, K_ANONYMITY_THRESHOLD)) {
            res.json({
                totalEvaluations,
                totalTeachers,
                totalPrograms,
                averageRatings: { teacher: 0, learning: 0, classroom: 0, overall: 0 },
                topTeachers: [],
                recentEvaluations: [],
                privacyNotice: `Insufficient data for privacy protection. At least ${K_ANONYMITY_THRESHOLD} evaluations required to display statistics.`
            });
            return;
        }
        // Calculate average ratings
        const avgRatings = await Evaluation_1.default.aggregate([
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
        const topTeachers = await Evaluation_1.default.aggregate([
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
            // K-ANONYMITY: Filter out teachers with less than 5 evaluations
            { $match: { evaluation_count: { $gte: 5 } } },
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
        // K-ANONYMITY: Only show recent evaluations if there are enough total evaluations
        let recentEvaluationsRaw = [];
        if (totalEvaluations >= K_ANONYMITY_THRESHOLD) {
            recentEvaluationsRaw = await Evaluation_1.default.find()
                .populate('teacher_id', 'full_name')
                .populate('course_id', 'name code')
                .sort({ createdAt: -1 })
                .limit(10)
                .select('-anonymous_token -ip_address')
                .lean();
        }
        // Transform to match frontend expectation (teacher, course instead of teacher_id, course_id)
        const recentEvaluations = recentEvaluationsRaw.map((evaluation) => {
            // Calculate averages (virtuals not available with .lean())
            const teacher_average = (evaluation.teacher_diction +
                evaluation.teacher_grammar +
                evaluation.teacher_personality +
                evaluation.teacher_disposition +
                evaluation.teacher_dynamic +
                evaluation.teacher_fairness) / 6;
            const learning_average = (evaluation.learning_motivation +
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
                evaluation.learning_reasonableness) / 13;
            const classroom_average = (evaluation.classroom_attendance +
                evaluation.classroom_policies +
                evaluation.classroom_discipline +
                evaluation.classroom_authority +
                evaluation.classroom_prayers +
                evaluation.classroom_punctuality) / 6;
            const overall_average = (teacher_average + learning_average + classroom_average) / 3;
            return {
                ...evaluation,
                comments: decryptCommentsField(evaluation.comments), // Decrypt for admin viewing
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
    }
    catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).json({ error: 'Error loading dashboard data' });
    }
});
// ==================== ADMIN EVALUATIONS ====================
router.get('/admin/evaluations', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const evaluationsRaw = await Evaluation_1.default.find()
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .sort({ createdAt: -1 })
            .select('-anonymous_token -ip_address')
            .lean();
        // Transform to match frontend expectation
        const evaluations = evaluationsRaw.map((evaluation) => {
            // Calculate averages (virtuals not available with .lean())
            const teacher_average = (evaluation.teacher_diction +
                evaluation.teacher_grammar +
                evaluation.teacher_personality +
                evaluation.teacher_disposition +
                evaluation.teacher_dynamic +
                evaluation.teacher_fairness) / 6;
            const learning_average = (evaluation.learning_motivation +
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
                evaluation.learning_reasonableness) / 13;
            const classroom_average = (evaluation.classroom_attendance +
                evaluation.classroom_policies +
                evaluation.classroom_discipline +
                evaluation.classroom_authority +
                evaluation.classroom_prayers +
                evaluation.classroom_punctuality) / 6;
            const overall_average = (teacher_average + learning_average + classroom_average) / 3;
            return {
                ...evaluation,
                comments: decryptCommentsField(evaluation.comments), // Decrypt for admin viewing
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
    }
    catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: 'Error fetching evaluations' });
    }
});
router.get('/admin/evaluations/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const evaluationRaw = await Evaluation_1.default.findById(req.params.id)
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
        const teacher_average = (evaluationRaw.teacher_diction +
            evaluationRaw.teacher_grammar +
            evaluationRaw.teacher_personality +
            evaluationRaw.teacher_disposition +
            evaluationRaw.teacher_dynamic +
            evaluationRaw.teacher_fairness) / 6;
        const learning_average = (evaluationRaw.learning_motivation +
            evaluationRaw.learning_critical_thinking +
            evaluationRaw.learning_organization +
            evaluationRaw.learning_interest +
            evaluationRaw.learning_explanation +
            evaluationRaw.learning_clarity +
            evaluationRaw.learning_integration +
            evaluationRaw.learning_mastery +
            evaluationRaw.learning_methodology +
            evaluationRaw.learning_values +
            evaluationRaw.learning_grading +
            evaluationRaw.learning_synthesis +
            evaluationRaw.learning_reasonableness) / 13;
        const classroom_average = (evaluationRaw.classroom_attendance +
            evaluationRaw.classroom_policies +
            evaluationRaw.classroom_discipline +
            evaluationRaw.classroom_authority +
            evaluationRaw.classroom_prayers +
            evaluationRaw.classroom_punctuality) / 6;
        const overall_average = (teacher_average + learning_average + classroom_average) / 3;
        const evaluation = {
            ...evaluationRaw,
            comments: decryptCommentsField(evaluationRaw.comments), // Decrypt for admin viewing
            teacher: evaluationRaw.teacher_id,
            course: evaluationRaw.course_id,
            program: evaluationRaw.program_id,
            teacher_id: evaluationRaw.teacher_id?._id,
            course_id: evaluationRaw.course_id?._id,
            program_id: evaluationRaw.program_id?._id,
            teacher_average,
            learning_average,
            classroom_average,
            overall_average
        };
        res.json({ evaluation });
    }
    catch (error) {
        console.error('Error fetching evaluation:', error);
        res.status(500).json({ error: 'Error fetching evaluation' });
    }
});
// ==================== ADMIN CRUD ROUTES ====================
// Teachers
router.get('/admin/teachers', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const teachers = await Teacher_1.default.find().sort({ full_name: 1 });
        res.json({ teachers });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching teachers' });
    }
});
router.post('/admin/teachers', auth_1.isAuthenticated, async (req, res) => {
    try {
        const teacher = await Teacher_1.default.create(req.body);
        res.json({ success: true, teacher });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/teachers/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const teacher = await Teacher_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, teacher });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/admin/teachers/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Teacher_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
// Programs
router.get('/admin/programs', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const programs = await Program_1.default.find().sort({ name: 1 });
        res.json({ programs });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching programs' });
    }
});
router.post('/admin/programs', auth_1.isAuthenticated, async (req, res) => {
    try {
        const program = await Program_1.default.create(req.body);
        res.json({ success: true, program });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/programs/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const program = await Program_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, program });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/admin/programs/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Program_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
// Courses
router.get('/admin/courses', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const courses = await Course_1.default.find().populate('program_id').sort({ name: 1 });
        res.json({ courses });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching courses' });
    }
});
router.post('/admin/courses', auth_1.isAuthenticated, async (req, res) => {
    try {
        const course = await Course_1.default.create(req.body);
        res.json({ success: true, course });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/courses/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const course = await Course_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, course });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/admin/courses/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Course_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
// Students
router.get('/admin/students', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const students = await Student_1.default.find().populate('program_id').sort({ full_name: 1 });
        res.json({ students });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});
router.post('/admin/students', auth_1.isAuthenticated, async (req, res) => {
    try {
        const student = await Student_1.default.create(req.body);
        res.json({ success: true, student });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/students/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        const student = await Student_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, student });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.delete('/admin/students/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        await Student_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
// Privacy Audit
router.post('/admin/privacy-audit/run', auth_1.isAuthenticated, async (_req, res) => {
    try {
        const { runPrivacyAudit } = await Promise.resolve().then(() => __importStar(require('../utils/privacy-audit')));
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
            priority: issue.severity === 'CRITICAL' ? 'high' : 'medium',
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
    }
    catch (error) {
        console.error('Error running privacy audit:', error);
        res.status(500).json({ error: 'Error running privacy audit' });
    }
});
exports.default = router;
//# sourceMappingURL=api.js.map