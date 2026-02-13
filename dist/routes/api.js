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
const encryption_helpers_1 = require("../utils/encryption-helpers");
// Import middleware
const auth_1 = require("../middleware/auth");
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
        // Fetch all students (cannot sort by encrypted field in database)
        const students = await Student_1.default.find().select('student_number');
        // Decrypt and prepare students for response
        const decryptedStudents = students.map(s => ({
            student_number: (0, encryption_helpers_1.safeDecrypt)(s.student_number),
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
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching students for testing' });
    }
});
// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Find admin by encrypted username field
        // Must fetch and decrypt because username is encrypted at rest
        const admin = await (0, encryption_helpers_1.findByEncryptedField)(Admin_1.default, 'username', username);
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
        req.session.username = (0, encryption_helpers_1.safeDecrypt)(admin.username);
        req.session.fullName = (0, encryption_helpers_1.safeDecrypt)(admin.full_name);
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
                        username: (0, encryption_helpers_1.safeDecrypt)(admin.username),
                        fullName: (0, encryption_helpers_1.safeDecrypt)(admin.full_name)
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
        // Find student by encrypted student_number field
        // Must fetch and decrypt because student_number is encrypted at rest
        const student = await (0, encryption_helpers_1.findByEncryptedField)(Student_1.default, 'student_number', student_number);
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
            .populate('teacher_id');
        // Decrypt enrollment and populated fields
        const decryptedEnrollments = enrollments.map(e => {
            const enrollment = e.toObject();
            // Decrypt enrollment fields
            const decryptedEnrollment = {
                ...enrollment,
                section_code: (0, encryption_helpers_1.safeDecrypt)(enrollment.section_code),
                school_year: (0, encryption_helpers_1.safeDecrypt)(enrollment.school_year),
                semester: (0, encryption_helpers_1.safeDecrypt)(enrollment.semester)
            };
            // Decrypt populated course fields
            if (enrollment.course_id) {
                decryptedEnrollment.course_id = {
                    ...enrollment.course_id,
                    name: (0, encryption_helpers_1.safeDecrypt)(enrollment.course_id.name),
                    code: (0, encryption_helpers_1.safeDecrypt)(enrollment.course_id.code)
                };
            }
            // Decrypt populated teacher fields
            if (enrollment.teacher_id) {
                decryptedEnrollment.teacher_id = {
                    ...enrollment.teacher_id,
                    full_name: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.full_name),
                    employee_id: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.employee_id),
                    email: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.email),
                    department: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.department),
                    status: (0, encryption_helpers_1.safeDecrypt)(enrollment.teacher_id.status)
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
            name: (0, encryption_helpers_1.safeDecrypt)(studentObj.program_id.name),
            code: (0, encryption_helpers_1.safeDecrypt)(studentObj.program_id.code)
        } : studentObj.program_id;
        res.json({
            authenticated: true,
            student: {
                program: decryptedProgram,
                year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level)
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
        // Decrypt enrollment and populated fields for student viewing
        const enrollmentObj = enrollment.toObject();
        // Decrypt course fields (including nested program)
        const course = enrollmentObj.course_id ? {
            ...enrollmentObj.course_id,
            name: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.name),
            code: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.code),
            program_id: enrollmentObj.course_id.program_id ? {
                ...enrollmentObj.course_id.program_id,
                name: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.program_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.course_id.program_id.code)
            } : enrollmentObj.course_id.program_id
        } : enrollmentObj.course_id;
        // Decrypt teacher fields
        const teacher = enrollmentObj.teacher_id ? {
            ...enrollmentObj.teacher_id,
            full_name: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.employee_id),
            email: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.email),
            department: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.department),
            status: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.teacher_id.status)
        } : enrollmentObj.teacher_id;
        res.json({
            success: true,
            enrollment: {
                _id: enrollment._id,
                course,
                teacher,
                has_evaluated: enrollment.has_evaluated,
                section_code: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.section_code),
                school_year: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.school_year),
                semester: (0, encryption_helpers_1.safeDecrypt)(enrollmentObj.semester)
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
        // Since status is encrypted, we need to fetch and decrypt to count active teachers
        const allTeachers = await Teacher_1.default.find();
        const totalTeachers = allTeachers.filter(teacher => {
            const status = (0, encryption_helpers_1.safeDecrypt)(teacher.status);
            return status === 'active';
        }).length;
        const totalPrograms = await Program_1.default.countDocuments();
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
        // Use actual ratings without any privacy noise
        const averageRatings = avgRatings.length > 0 ? avgRatings[0] :
            { teacher: 0, learning: 0, classroom: 0, overall: 0 };
        // Top teachers
        const topTeachersRaw = await Evaluation_1.default.aggregate([
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
        const topTeachers = topTeachersRaw.map((teacher) => ({
            ...teacher,
            full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name)
        }));
        // Recent evaluations
        const recentEvaluationsRaw = await Evaluation_1.default.find()
            .populate('teacher_id', 'full_name')
            .populate('course_id', 'name code')
            .sort({ createdAt: -1 })
            .limit(10)
            .select('-anonymous_token -ip_address')
            .lean();
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
            // Decrypt populated teacher fields
            const teacher = evaluation.teacher_id ? {
                _id: evaluation.teacher_id._id,
                full_name: (0, encryption_helpers_1.safeDecrypt)(evaluation.teacher_id.full_name)
            } : evaluation.teacher_id;
            // Decrypt populated course fields
            const course = evaluation.course_id ? {
                _id: evaluation.course_id._id,
                name: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.code)
            } : evaluation.course_id;
            return {
                ...evaluation,
                school_year: (0, encryption_helpers_1.safeDecrypt)(evaluation.school_year), // Decrypt Evaluation's own encrypted field
                year_level: (0, encryption_helpers_1.safeDecrypt)(evaluation.year_level), // Decrypt Evaluation's own encrypted field
                status: (0, encryption_helpers_1.safeDecrypt)(evaluation.status), // Decrypt Evaluation's own encrypted field
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
    }
    catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).json({ error: 'Error loading dashboard data' });
    }
});
// ==================== ADMIN EVALUATIONS ====================
router.get('/admin/evaluations', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Get total count
        const totalCount = await Evaluation_1.default.countDocuments();
        const totalPages = Math.ceil(totalCount / limit);
        const evaluationsRaw = await Evaluation_1.default.find()
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
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
            // Decrypt populated fields for admin viewing
            const teacher = evaluation.teacher_id ? {
                _id: evaluation.teacher_id._id,
                full_name: (0, encryption_helpers_1.safeDecrypt)(evaluation.teacher_id.full_name),
                employee_id: (0, encryption_helpers_1.safeDecrypt)(evaluation.teacher_id.employee_id)
            } : evaluation.teacher_id;
            const course = evaluation.course_id ? {
                _id: evaluation.course_id._id,
                name: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(evaluation.course_id.code)
            } : evaluation.course_id;
            const program = evaluation.program_id ? {
                _id: evaluation.program_id._id,
                name: (0, encryption_helpers_1.safeDecrypt)(evaluation.program_id.name)
            } : evaluation.program_id;
            return {
                ...evaluation,
                school_year: (0, encryption_helpers_1.safeDecrypt)(evaluation.school_year), // Decrypt Evaluation's own encrypted field
                year_level: (0, encryption_helpers_1.safeDecrypt)(evaluation.year_level), // Decrypt Evaluation's own encrypted field
                status: (0, encryption_helpers_1.safeDecrypt)(evaluation.status), // Decrypt Evaluation's own encrypted field
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
        res.json({
            evaluations,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
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
        // Decrypt populated fields for admin viewing
        const teacher = evaluationRaw.teacher_id ? {
            _id: evaluationRaw.teacher_id._id,
            full_name: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.teacher_id.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.teacher_id.employee_id)
        } : evaluationRaw.teacher_id;
        const course = evaluationRaw.course_id ? {
            _id: evaluationRaw.course_id._id,
            name: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.course_id.name),
            code: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.course_id.code)
        } : evaluationRaw.course_id;
        const program = evaluationRaw.program_id ? {
            _id: evaluationRaw.program_id._id,
            name: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.program_id.name)
        } : evaluationRaw.program_id;
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
            school_year: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.school_year), // Decrypt Evaluation's own encrypted field
            year_level: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.year_level), // Decrypt Evaluation's own encrypted field
            status: (0, encryption_helpers_1.safeDecrypt)(evaluationRaw.status), // Decrypt Evaluation's own encrypted field
            comments: decryptCommentsField(evaluationRaw.comments), // Decrypt for admin viewing
            teacher, // Use decrypted teacher
            course, // Use decrypted course
            program, // Use decrypted program
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
router.get('/admin/teachers', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all teachers (cannot sort by encrypted field in database)
        const teachersRaw = await Teacher_1.default.find();
        // Decrypt fields and prepare for admin viewing
        const teachers = teachersRaw.map(t => {
            const teacher = t.toObject();
            return {
                ...teacher,
                full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name),
                employee_id: (0, encryption_helpers_1.safeDecrypt)(teacher.employee_id),
                email: (0, encryption_helpers_1.safeDecrypt)(teacher.email),
                department: (0, encryption_helpers_1.safeDecrypt)(teacher.department),
                status: (0, encryption_helpers_1.safeDecrypt)(teacher.status)
            };
        });
        // Sort by full_name in memory (after decryption)
        teachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
        // Apply pagination in memory
        const totalCount = teachers.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedTeachers = teachers.slice(skip, skip + limit);
        res.json({
            teachers: paginatedTeachers,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching teachers' });
    }
});
router.post('/admin/teachers', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const teacherData = {
            ...req.body,
            full_name: (0, encryption_helpers_1.safeEncrypt)(req.body.full_name),
            employee_id: (0, encryption_helpers_1.safeEncrypt)(req.body.employee_id),
            email: (0, encryption_helpers_1.safeEncrypt)(req.body.email),
            department: (0, encryption_helpers_1.safeEncrypt)(req.body.department),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const teacher = await Teacher_1.default.create(teacherData);
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(teacher.employee_id),
            email: (0, encryption_helpers_1.safeDecrypt)(teacher.email),
            department: (0, encryption_helpers_1.safeDecrypt)(teacher.department),
            status: (0, encryption_helpers_1.safeDecrypt)(teacher.status)
        };
        res.json({ success: true, teacher: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/teachers/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const teacherData = {
            ...req.body,
            full_name: (0, encryption_helpers_1.safeEncrypt)(req.body.full_name),
            employee_id: (0, encryption_helpers_1.safeEncrypt)(req.body.employee_id),
            email: (0, encryption_helpers_1.safeEncrypt)(req.body.email),
            department: (0, encryption_helpers_1.safeEncrypt)(req.body.department),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const teacher = await Teacher_1.default.findByIdAndUpdate(req.params.id, teacherData, { new: true });
        if (!teacher) {
            res.status(404).json({ message: 'Teacher not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...teacher.toObject(),
            full_name: (0, encryption_helpers_1.safeDecrypt)(teacher.full_name),
            employee_id: (0, encryption_helpers_1.safeDecrypt)(teacher.employee_id),
            email: (0, encryption_helpers_1.safeDecrypt)(teacher.email),
            department: (0, encryption_helpers_1.safeDecrypt)(teacher.department),
            status: (0, encryption_helpers_1.safeDecrypt)(teacher.status)
        };
        res.json({ success: true, teacher: response });
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
router.get('/admin/programs', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all programs (cannot sort by encrypted field in database)
        const programsRaw = await Program_1.default.find();
        // Decrypt fields and prepare for admin viewing
        const programs = programsRaw.map(p => {
            const program = p.toObject();
            return {
                ...program,
                name: (0, encryption_helpers_1.safeDecrypt)(program.name),
                code: (0, encryption_helpers_1.safeDecrypt)(program.code)
            };
        });
        // Sort by name in memory (after decryption)
        programs.sort((a, b) => a.name.localeCompare(b.name));
        // Apply pagination in memory
        const totalCount = programs.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedPrograms = programs.slice(skip, skip + limit);
        res.json({
            programs: paginatedPrograms,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching programs' });
    }
});
router.post('/admin/programs', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const programData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const program = await Program_1.default.create(programData);
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(program.name),
            code: (0, encryption_helpers_1.safeDecrypt)(program.code)
        };
        res.json({ success: true, program: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/programs/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const programData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const program = await Program_1.default.findByIdAndUpdate(req.params.id, programData, { new: true });
        if (!program) {
            res.status(404).json({ message: 'Program not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...program.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(program.name),
            code: (0, encryption_helpers_1.safeDecrypt)(program.code)
        };
        res.json({ success: true, program: response });
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
router.get('/admin/courses', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all courses (cannot sort by encrypted field in database)
        const coursesRaw = await Course_1.default.find().populate('program_id');
        // Decrypt fields and prepare for admin viewing
        const courses = coursesRaw.map(c => {
            const course = c.toObject();
            // Also decrypt populated program fields
            const program = course.program_id ? {
                ...course.program_id,
                name: (0, encryption_helpers_1.safeDecrypt)(course.program_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(course.program_id.code)
            } : course.program_id;
            return {
                ...course,
                name: (0, encryption_helpers_1.safeDecrypt)(course.name),
                code: (0, encryption_helpers_1.safeDecrypt)(course.code),
                program_id: program
            };
        });
        // Sort by name in memory (after decryption)
        courses.sort((a, b) => a.name.localeCompare(b.name));
        // Apply pagination in memory
        const totalCount = courses.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedCourses = courses.slice(skip, skip + limit);
        res.json({
            courses: paginatedCourses,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching courses' });
    }
});
router.post('/admin/courses', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const courseData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const course = await Course_1.default.create(courseData);
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(course.name),
            code: (0, encryption_helpers_1.safeDecrypt)(course.code)
        };
        res.json({ success: true, course: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/courses/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const courseData = {
            ...req.body,
            name: (0, encryption_helpers_1.safeEncrypt)(req.body.name),
            code: (0, encryption_helpers_1.safeEncrypt)(req.body.code)
        };
        const course = await Course_1.default.findByIdAndUpdate(req.params.id, courseData, { new: true });
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...course.toObject(),
            name: (0, encryption_helpers_1.safeDecrypt)(course.name),
            code: (0, encryption_helpers_1.safeDecrypt)(course.code)
        };
        res.json({ success: true, course: response });
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
router.get('/admin/students', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Fetch all students (cannot sort by encrypted field in database)
        const studentsRaw = await Student_1.default.find().populate('program_id');
        // Decrypt fields and prepare for admin viewing
        const students = studentsRaw.map(s => {
            const student = s.toObject();
            // Also decrypt populated program fields
            const program = student.program_id ? {
                ...student.program_id,
                name: (0, encryption_helpers_1.safeDecrypt)(student.program_id.name),
                code: (0, encryption_helpers_1.safeDecrypt)(student.program_id.code)
            } : student.program_id;
            return {
                ...student,
                student_number: (0, encryption_helpers_1.safeDecrypt)(student.student_number),
                year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level),
                section: (0, encryption_helpers_1.safeDecrypt)(student.section),
                status: (0, encryption_helpers_1.safeDecrypt)(student.status),
                program_id: program
            };
        });
        // Sort by student_number in memory (after decryption)
        students.sort((a, b) => a.student_number.localeCompare(b.student_number, undefined, { numeric: true }));
        // Apply pagination in memory
        const totalCount = students.length;
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;
        const paginatedStudents = students.slice(skip, skip + limit);
        res.json({
            students: paginatedStudents,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasMore: page < totalPages
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});
router.post('/admin/students', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before saving
        const studentData = {
            ...req.body,
            student_number: (0, encryption_helpers_1.safeEncrypt)(req.body.student_number),
            year_level: (0, encryption_helpers_1.safeEncrypt)(req.body.year_level),
            section: (0, encryption_helpers_1.safeEncrypt)(req.body.section),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const student = await Student_1.default.create(studentData);
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: (0, encryption_helpers_1.safeDecrypt)(student.student_number),
            year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level),
            section: (0, encryption_helpers_1.safeDecrypt)(student.section),
            status: (0, encryption_helpers_1.safeDecrypt)(student.status)
        };
        res.json({ success: true, student: response });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
});
router.put('/admin/students/:id', auth_1.isAuthenticated, async (req, res) => {
    try {
        // Encrypt fields before updating
        const studentData = {
            ...req.body,
            student_number: (0, encryption_helpers_1.safeEncrypt)(req.body.student_number),
            year_level: (0, encryption_helpers_1.safeEncrypt)(req.body.year_level),
            section: (0, encryption_helpers_1.safeEncrypt)(req.body.section),
            status: (0, encryption_helpers_1.safeEncrypt)(req.body.status)
        };
        const student = await Student_1.default.findByIdAndUpdate(req.params.id, studentData, { new: true });
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        // Decrypt for response to admin
        const response = {
            ...student.toObject(),
            student_number: (0, encryption_helpers_1.safeDecrypt)(student.student_number),
            year_level: (0, encryption_helpers_1.safeDecrypt)(student.year_level),
            section: (0, encryption_helpers_1.safeDecrypt)(student.section),
            status: (0, encryption_helpers_1.safeDecrypt)(student.status)
        };
        res.json({ success: true, student: response });
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