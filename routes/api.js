const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Import Models
const Admin = require('../models/Admin');
const Program = require('../models/Program');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');

// Import Privacy Protection Utilities
const PrivacyProtection = require('../utils/privacy-protection');

// Import middleware
const { isAuthenticated } = require('../middleware/auth');

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

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        // Update last login
        admin.last_login = new Date();
        await admin.save();
        
        // Set session
        req.session.adminId = admin._id.toString();
        req.session.username = admin.username;
        req.session.fullName = admin.full_name;
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Session error' 
                });
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

// Student Login
router.post('/student/login', async (req, res) => {
    try {
        const { student_number } = req.body;
        
        if (!student_number) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter your School ID' 
            });
        }
        
        const student = await Student.findOne({ student_number }).populate('program_id');
        
        if (!student) {
            return res.status(404).json({ 
                success: false, 
                message: 'School ID not found. Please check your ID and try again.' 
            });
        }
        
        // Store ONLY student ObjectId in session (never student_number for privacy)
        req.session.studentId = student._id;
        
        req.session.save((err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Session error' 
                });
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
router.get('/student/subjects', async (req, res) => {
    try {
        if (!req.session.studentId) {
            return res.json({ authenticated: false });
        }
        
        const student = await Student.findById(req.session.studentId).populate('program_id');
        
        if (!student) {
            return res.json({ authenticated: false });
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
                year_level: student.year_level,
                school_year: student.school_year,
                semester: student.semester
            },
            enrollments: enrollments.map(e => ({
                _id: e._id,
                has_evaluated: e.has_evaluated,
                course: e.course_id,
                teacher: e.teacher_id
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
router.get('/student/enrollment/:enrollmentId', async (req, res) => {
    try {
        if (!req.session.studentId) {
            return res.json({ success: false, message: 'Please login first' });
        }
        
        const enrollment = await Enrollment.findById(req.params.enrollmentId)
            .populate('student_id')
            .populate({
                path: 'course_id',
                populate: { path: 'program_id' }
            })
            .populate('teacher_id');
        
        if (!enrollment) {
            return res.json({ success: false, message: 'Enrollment not found' });
        }
        
        // Verify enrollment belongs to logged-in student
        if (enrollment.student_id._id.toString() !== req.session.studentId) {
            return res.json({ success: false, message: 'Unauthorized access' });
        }
        
        if (enrollment.has_evaluated) {
            return res.json({ success: false, message: 'You have already evaluated this subject' });
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
router.post('/student/submit-evaluation', async (req, res) => {
    try {
        if (!req.session.studentId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please login first' 
            });
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
            return res.status(404).json({ 
                success: false, 
                message: 'Enrollment not found' 
            });
        }
        
        // Verify enrollment belongs to logged-in student
        if (enrollment.student_id._id.toString() !== req.session.studentId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized access' 
            });
        }
        
        if (enrollment.has_evaluated) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already evaluated this subject' 
            });
        }
        
        // PRIVACY PROTECTION
        const rawIp = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip;
        const anonymizedIp = PrivacyProtection.anonymizeIpAddress(rawIp);
        const anonymousToken = PrivacyProtection.generateAnonymousToken(enrollment);
        const safeTimestamp = PrivacyProtection.getSafeSubmissionTimestamp();
        
        // Calculate averages
        const teacherRatings = [
            data.teacher_care, data.teacher_respect, data.teacher_patience,
            data.teacher_shows_mastery, data.teacher_updated_informed,
            data.teacher_demonstrates_competence
        ].map(Number);
        
        const learningRatings = [
            data.learning_clear_objectives, data.learning_syllabus_followed,
            data.learning_starts_ends_on_time, data.learning_concepts_understood,
            data.learning_materials_appropriate, data.learning_allows_questions,
            data.learning_encourages_participation, data.learning_provides_relevant_examples,
            data.learning_provides_activities, data.learning_relates_to_life,
            data.learning_relates_to_other_subjects, data.learning_fair_grading,
            data.learning_returns_outputs_on_time
        ].map(Number);
        
        const classroomRatings = [
            data.classroom_starts_on_time, data.classroom_time_managed_effectively,
            data.classroom_student_behavior, data.classroom_conducive_environment,
            data.classroom_appropriate_strategies, data.classroom_communication_channels
        ].map(Number);
        
        const teacher_average = teacherRatings.reduce((a, b) => a + b, 0) / teacherRatings.length;
        const learning_average = learningRatings.reduce((a, b) => a + b, 0) / learningRatings.length;
        const classroom_average = classroomRatings.reduce((a, b) => a + b, 0) / classroomRatings.length;
        const overall_average = (teacher_average + learning_average + classroom_average) / 3;
        
        // Create evaluation
        const evaluation = await Evaluation.create({
            school_year: enrollment.school_year,
            anonymous_token: anonymousToken,
            program_id: enrollment.student_id.program_id,
            year_level: enrollment.student_id.year_level,
            status: enrollment.student_id.status,
            course_id: enrollment.course_id._id,
            teacher_id: enrollment.teacher_id._id,
            
            // Teacher ratings
            teacher_care: Number(data.teacher_care),
            teacher_respect: Number(data.teacher_respect),
            teacher_patience: Number(data.teacher_patience),
            teacher_shows_mastery: Number(data.teacher_shows_mastery),
            teacher_updated_informed: Number(data.teacher_updated_informed),
            teacher_demonstrates_competence: Number(data.teacher_demonstrates_competence),
            teacher_average,
            
            // Learning process ratings
            learning_clear_objectives: Number(data.learning_clear_objectives),
            learning_syllabus_followed: Number(data.learning_syllabus_followed),
            learning_starts_ends_on_time: Number(data.learning_starts_ends_on_time),
            learning_concepts_understood: Number(data.learning_concepts_understood),
            learning_materials_appropriate: Number(data.learning_materials_appropriate),
            learning_allows_questions: Number(data.learning_allows_questions),
            learning_encourages_participation: Number(data.learning_encourages_participation),
            learning_provides_relevant_examples: Number(data.learning_provides_relevant_examples),
            learning_provides_activities: Number(data.learning_provides_activities),
            learning_relates_to_life: Number(data.learning_relates_to_life),
            learning_relates_to_other_subjects: Number(data.learning_relates_to_other_subjects),
            learning_fair_grading: Number(data.learning_fair_grading),
            learning_returns_outputs_on_time: Number(data.learning_returns_outputs_on_time),
            learning_average,
            
            // Classroom management ratings
            classroom_starts_on_time: Number(data.classroom_starts_on_time),
            classroom_time_managed_effectively: Number(data.classroom_time_managed_effectively),
            classroom_student_behavior: Number(data.classroom_student_behavior),
            classroom_conducive_environment: Number(data.classroom_conducive_environment),
            classroom_appropriate_strategies: Number(data.classroom_appropriate_strategies),
            classroom_communication_channels: Number(data.classroom_communication_channels),
            classroom_average,
            
            overall_average,
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

router.get('/admin/dashboard', isAuthenticated, async (req, res) => {
    try {
        const totalEvaluations = await Evaluation.countDocuments();
        const totalTeachers = await Teacher.countDocuments({ status: 'active' });
        const totalPrograms = await Program.countDocuments();
        
        // Calculate average ratings
        const avgRatings = await Evaluation.aggregate([
            {
                $group: {
                    _id: null,
                    teacher: { $avg: '$teacher_average' },
                    learning: { $avg: '$learning_average' },
                    classroom: { $avg: '$classroom_average' },
                    overall: { $avg: '$overall_average' }
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
                $group: {
                    _id: '$teacher_id',
                    average_rating: { $avg: '$overall_average' },
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
        const recentEvaluations = await Evaluation.find()
            .populate('teacher_id', 'full_name')
            .populate('course_id', 'name code')
            .sort({ created_at: -1 })
            .limit(10)
            .select('-anonymous_token -ip_address');
        
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

router.get('/admin/evaluations', isAuthenticated, async (req, res) => {
    try {
        const evaluations = await Evaluation.find()
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .sort({ created_at: -1 })
            .select('-anonymous_token -ip_address');
        
        res.json({ evaluations });
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: 'Error fetching evaluations' });
    }
});

router.get('/admin/evaluations/:id', isAuthenticated, async (req, res) => {
    try {
        const evaluation = await Evaluation.findById(req.params.id)
            .populate('teacher_id', 'full_name employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name')
            .select('-anonymous_token -ip_address');
        
        if (!evaluation) {
            return res.status(404).json({ error: 'Evaluation not found' });
        }
        
        res.json({ evaluation });
    } catch (error) {
        console.error('Error fetching evaluation:', error);
        res.status(500).json({ error: 'Error fetching evaluation' });
    }
});

// ==================== ADMIN CRUD ROUTES ====================

// Teachers
router.get('/admin/teachers', isAuthenticated, async (req, res) => {
    try {
        const teachers = await Teacher.find().sort({ full_name: 1 });
        res.json({ teachers });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching teachers' });
    }
});

router.post('/admin/teachers', isAuthenticated, async (req, res) => {
    try {
        const teacher = await Teacher.create(req.body);
        res.json({ success: true, teacher });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/admin/teachers/:id', isAuthenticated, async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, teacher });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/admin/teachers/:id', isAuthenticated, async (req, res) => {
    try {
        await Teacher.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Programs
router.get('/admin/programs', isAuthenticated, async (req, res) => {
    try {
        const programs = await Program.find().sort({ name: 1 });
        res.json({ programs });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching programs' });
    }
});

router.post('/admin/programs', isAuthenticated, async (req, res) => {
    try {
        const program = await Program.create(req.body);
        res.json({ success: true, program });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/admin/programs/:id', isAuthenticated, async (req, res) => {
    try {
        const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, program });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/admin/programs/:id', isAuthenticated, async (req, res) => {
    try {
        await Program.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Courses
router.get('/admin/courses', isAuthenticated, async (req, res) => {
    try {
        const courses = await Course.find().populate('program_id').sort({ name: 1 });
        res.json({ courses });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching courses' });
    }
});

router.post('/admin/courses', isAuthenticated, async (req, res) => {
    try {
        const course = await Course.create(req.body);
        res.json({ success: true, course });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/admin/courses/:id', isAuthenticated, async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, course });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/admin/courses/:id', isAuthenticated, async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Students
router.get('/admin/students', isAuthenticated, async (req, res) => {
    try {
        const students = await Student.find().populate('program_id').sort({ full_name: 1 });
        res.json({ students });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});

router.post('/admin/students', isAuthenticated, async (req, res) => {
    try {
        const student = await Student.create(req.body);
        res.json({ success: true, student });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/admin/students/:id', isAuthenticated, async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, student });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/admin/students/:id', isAuthenticated, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Privacy Audit
router.post('/admin/privacy-audit/run', isAuthenticated, async (req, res) => {
    try {
        const PrivacyAudit = require('../utils/privacy-audit');
        const results = await PrivacyAudit.runComprehensiveAudit();
        res.json({ results });
    } catch (error) {
        console.error('Error running privacy audit:', error);
        res.status(500).json({ error: 'Error running privacy audit' });
    }
});

module.exports = router;
