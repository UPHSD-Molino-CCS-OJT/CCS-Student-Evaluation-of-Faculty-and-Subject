// Only load dotenv in development, Vercel provides environment variables directly
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const { connection: db, mongoose } = require('./config/database');
const { isAuthenticated, isGuest } = require('./middleware/auth');

// Import Models
const Admin = require('./models/Admin');
const Program = require('./models/Program');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');
const Evaluation = require('./models/Evaluation');
const Student = require('./models/Student');
const Enrollment = require('./models/Enrollment');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration with MongoDB store for Vercel compatibility
// IMPORTANT: For serverless, session store may not be ready on first request
// Session configuration optimized for Vercel serverless
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'uphsd_secret_key',
    resave: true,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false, // Set to false to allow non-HTTPS in development
        sameSite: 'lax'
    }
};

// Use MongoDB store for sessions
if (process.env.MONGODB_URI) {
    try {
        sessionConfig.store = MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            touchAfter: 24 * 3600,
            autoRemove: 'native'
        });
        console.log('✓ MongoDB session store configured');
    } catch (error) {
        console.warn('Session store error:', error.message);
    }
}

app.use(session(sessionConfig));

app.use(flash());

// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.admin = req.session.adminId ? { id: req.session.adminId, username: req.session.username } : null;
    next();
});

// ==================== AUTO-INITIALIZE DATABASE ====================
let initPromise = null;

async function initializeDatabase() {
    // Return existing promise if initialization is in progress
    if (initPromise) {
        return initPromise;
    }
    
    initPromise = (async () => {
        try {
            // Check if admin exists
            const adminCount = await Admin.countDocuments();
        
        if (adminCount === 0) {
            console.log('📦 No data found. Initializing database with sample data...\n');
            
            // Create default admin (password: admin123)
            console.log('👤 Creating default admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await Admin.create({
                username: 'admin',
                password: hashedPassword,
                full_name: 'System Administrator',
                email: 'admin@uphsd.edu.ph'
            });
            console.log('✓ Admin created (username: admin, password: admin123)');
            
            // Create default programs
            console.log('📚 Creating default programs...');
            const programs = await Program.create([
                {
                    name: 'BS Computer Science - Data Science',
                    code: 'BSCS-DS'
                },
                {
                    name: 'BS Information Technology - Game Development',
                    code: 'BSIT-GD'
                }
            ]);
            console.log(`✓ Created ${programs.length} programs`);
            
            // Create sample teachers
            console.log('👨‍🏫 Creating sample teachers...');
            const teachers = await Teacher.create([
                {
                    full_name: 'Prof. Juan Dela Cruz',
                    employee_id: 'EMP001',
                    email: 'jdelacruz@uphsd.edu.ph',
                    department: 'Computer Science',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Maria Santos',
                    employee_id: 'EMP002',
                    email: 'msantos@uphsd.edu.ph',
                    department: 'Information Technology',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Jose Garcia',
                    employee_id: 'EMP003',
                    email: 'jgarcia@uphsd.edu.ph',
                    department: 'Computer Science',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Ana Reyes',
                    employee_id: 'EMP004',
                    email: 'areyes@uphsd.edu.ph',
                    department: 'Information Technology',
                    status: 'active'
                },
                {
                    full_name: 'Prof. Pedro Martinez',
                    employee_id: 'EMP005',
                    email: 'pmartinez@uphsd.edu.ph',
                    department: 'Computer Science',
                    status: 'active'
                }
            ]);
            console.log(`✓ Created ${teachers.length} teachers`);
            
            // Create sample courses
            console.log('📖 Creating sample courses...');
            const courses = await Course.create([
                // BSCS-DS courses
                {
                    name: 'Data Structures and Algorithms',
                    code: 'CS201',
                    program_id: programs[0]._id
                },
                {
                    name: 'Database Management Systems',
                    code: 'CS202',
                    program_id: programs[0]._id
                },
                {
                    name: 'Machine Learning',
                    code: 'CS301',
                    program_id: programs[0]._id
                },
                {
                    name: 'Statistical Analysis',
                    code: 'CS302',
                    program_id: programs[0]._id
                },
                {
                    name: 'Big Data Analytics',
                    code: 'CS401',
                    program_id: programs[0]._id
                },
                // BSIT-GD courses
                {
                    name: 'Game Design Fundamentals',
                    code: 'IT201',
                    program_id: programs[1]._id
                },
                {
                    name: 'Game Programming',
                    code: 'IT202',
                    program_id: programs[1]._id
                },
                {
                    name: '3D Modeling and Animation',
                    code: 'IT301',
                    program_id: programs[1]._id
                },
                {
                    name: 'Game Engine Architecture',
                    code: 'IT302',
                    program_id: programs[1]._id
                },
                {
                    name: 'Mobile Game Development',
                    code: 'IT401',
                    program_id: programs[1]._id
                }
            ]);
            console.log(`✓ Created ${courses.length} courses`);
            
            console.log('\n✅ Database initialized successfully!');
            console.log('📊 Summary:');
            console.log(`  • 1 admin account`);
            console.log(`  • ${programs.length} programs`);
            console.log(`  • ${teachers.length} teachers`);
            console.log(`  • ${courses.length} courses\n`);
        } else {
            console.log('✓ Database already initialized with data');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        console.error('Full error:', error);
        initPromise = null; // Reset on error so it can retry
        return false;
    }
    })();
    
    return initPromise;
}

// ==================== PUBLIC ROUTES ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        mongodb: db.readyState === 1 ? 'connected' : 'disconnected',
        env: process.env.NODE_ENV || 'development'
    });
});

// Redirect root to student login
app.get('/', async (req, res) => {
    try {
        // Initialize database if needed
        await initializeDatabase();
        res.redirect('/student/login');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading application');
    }
});

// Student Login Page
app.get('/student/login', async (req, res) => {
    try {
        await initializeDatabase();
        res.render('student-login');
    } catch (error) {
        console.error('Error loading student login:', error);
        res.status(500).send('Error loading login page');
    }
});

// Student Login Submit
app.post('/student/login', async (req, res) => {
    try {
        const { student_number } = req.body;
        
        if (!student_number) {
            req.flash('error', 'Please enter your School ID');
            return res.redirect('/student/login');
        }
        
        // Find student by student number
        const student = await Student.findOne({ student_number }).populate('program_id');
        
        if (!student) {
            req.flash('error', 'School ID not found. Please check your ID and try again.');
            return res.redirect('/student/login');
        }
        
        // Store student ID in session
        req.session.studentId = student._id;
        req.session.studentNumber = student.student_number;
        
        res.redirect('/student/subjects');
    } catch (error) {
        console.error('Error during student login:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/student/login');
    }
});

// Student Subjects Page
app.get('/student/subjects', async (req, res) => {
    try {
        // Check if student is logged in
        if (!req.session.studentId) {
            req.flash('error', 'Please login first');
            return res.redirect('/student/login');
        }
        
        // Get student info
        const student = await Student.findById(req.session.studentId).populate('program_id');
        
        if (!student) {
            req.flash('error', 'Student not found');
            return res.redirect('/student/login');
        }
        
        // Get student's enrollments with populated data
        const enrollments = await Enrollment.find({ student_id: student._id })
            .populate('course_id')
            .populate('teacher_id')
            .sort({ 'course_id.name': 1 });
        
        // Count evaluated subjects
        const evaluatedCount = enrollments.filter(e => e.has_evaluated).length;
        
        res.render('student-subjects', {
            student,
            enrollments,
            evaluatedCount
        });
    } catch (error) {
        console.error('Error loading student subjects:', error);
        req.flash('error', 'Error loading subjects');
        res.redirect('/student/login');
    }
});

// Student Evaluate Specific Subject
app.get('/student/evaluate/:enrollmentId', async (req, res) => {
    try {
        // Check if student is logged in
        if (!req.session.studentId) {
            req.flash('error', 'Please login first');
            return res.redirect('/student/login');
        }
        
        // Get enrollment with populated data
        const enrollment = await Enrollment.findById(req.params.enrollmentId)
            .populate('student_id')
            .populate({
                path: 'course_id',
                populate: { path: 'program_id' }
            })
            .populate('teacher_id');
        
        if (!enrollment) {
            req.flash('error', 'Enrollment not found');
            return res.redirect('/student/subjects');
        }
        
        // Verify enrollment belongs to logged-in student
        if (enrollment.student_id._id.toString() !== req.session.studentId) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/student/subjects');
        }
        
        // Check if already evaluated
        if (enrollment.has_evaluated) {
            req.flash('error', 'You have already evaluated this subject');
            return res.redirect('/student/subjects');
        }
        
        res.render('student-evaluate', {
            enrollment,
            student: enrollment.student_id,
            course: enrollment.course_id,
            teacher: enrollment.teacher_id,
            program: enrollment.course_id.program_id
        });
    } catch (error) {
        console.error('Error loading evaluation form:', error);
        req.flash('error', 'Error loading evaluation form');
        res.redirect('/student/subjects');
    }
});

// Submit Student Evaluation
app.post('/student/submit-evaluation', async (req, res) => {
    try {
        // Check if student is logged in
        if (!req.session.studentId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please login first' 
            });
        }
        
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
        
        // Check if already evaluated
        if (enrollment.has_evaluated) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already evaluated this subject' 
            });
        }
        
        // Validate ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(data.program) || 
            !mongoose.Types.ObjectId.isValid(data.course) ||
            !mongoose.Types.ObjectId.isValid(data.teacher)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid data format' 
            });
        }
        
        // Get client IP address
        const clientIp = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        req.ip;
        
        // Generate anonymous token using crypto hash
        // This ensures complete anonymity - no way to trace back to student
        const anonymousToken = crypto
            .createHash('sha256')
            .update(`${enrollment._id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`)
            .digest('hex');
        
        // Create evaluation
        const evaluation = await Evaluation.create({
            school_year: enrollment.school_year,
            anonymous_token: anonymousToken,
            program_id: data.program,
            year_level: enrollment.student_id.year_level,
            status: enrollment.student_id.status,
            course_id: data.course,
            teacher_id: data.teacher,
            
            // Teacher ratings (6 criteria)
            teacher_diction: parseInt(data.teacher_diction),
            teacher_grammar: parseInt(data.teacher_grammar),
            teacher_personality: parseInt(data.teacher_personality),
            teacher_disposition: parseInt(data.teacher_disposition),
            teacher_dynamic: parseInt(data.teacher_dynamic),
            teacher_fairness: parseInt(data.teacher_fairness),
            
            // Learning process ratings (13 criteria)
            learning_motivation: parseInt(data.learning_motivation),
            learning_critical_thinking: parseInt(data.learning_critical_thinking),
            learning_organization: parseInt(data.learning_organization),
            learning_interest: parseInt(data.learning_interest),
            learning_explanation: parseInt(data.learning_explanation),
            learning_clarity: parseInt(data.learning_clarity),
            learning_integration: parseInt(data.learning_integration),
            learning_mastery: parseInt(data.learning_mastery),
            learning_methodology: parseInt(data.learning_methodology),
            learning_values: parseInt(data.learning_values),
            learning_grading: parseInt(data.learning_grading),
            learning_synthesis: parseInt(data.learning_synthesis),
            learning_reasonableness: parseInt(data.learning_reasonableness),
            
            // Classroom management ratings (6 criteria)
            classroom_attendance: parseInt(data.classroom_attendance),
            classroom_policies: parseInt(data.classroom_policies),
            classroom_discipline: parseInt(data.classroom_discipline),
            classroom_authority: parseInt(data.classroom_authority),
            classroom_prayers: parseInt(data.classroom_prayers),
            classroom_punctuality: parseInt(data.classroom_punctuality),
            
            comments: data.comments || '',
            ip_address: clientIp
        });
        
        // Update enrollment as evaluated
        enrollment.has_evaluated = true;
        enrollment.evaluation_id = evaluation._id;
        await enrollment.save();
        
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

// Get courses by program (AJAX)
app.get('/api/courses/:programId', async (req, res) => {
    try {
        const courses = await Course.find({ program_id: req.params.programId }).sort({ name: 1 });
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Submit evaluation
app.post('/submit-evaluation', async (req, res) => {
    try {
        const data = req.body;
        
        // Validate required fields
        if (!data.program || !data.course || !data.teacher) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select Program, Course, and Teacher.' 
            });
        }

        // Validate that IDs are not "undefined" strings
        if (data.program === 'undefined' || data.course === 'undefined' || data.teacher === 'undefined') {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select valid Program, Course, and Teacher.' 
            });
        }

        // Validate ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(data.program) || 
            !mongoose.Types.ObjectId.isValid(data.course) || 
            !mongoose.Types.ObjectId.isValid(data.teacher)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid Program, Course, or Teacher selection.' 
            });
        }
        
        // Generate anonymous token using crypto hash
        const anonymousToken = crypto
            .createHash('sha256')
            .update(`${data.course}-${data.teacher}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`)
            .digest('hex');
        
        const evaluation = new Evaluation({
            school_year: data.schoolYear,
            anonymous_token: anonymousToken,
            program_id: data.program,
            year_level: data.yearLevel,
            status: data.status,
            course_id: data.course,
            teacher_id: data.teacher,
            teacher_diction: data.teacher_1,
            teacher_grammar: data.teacher_2,
            teacher_personality: data.teacher_3,
            teacher_disposition: data.teacher_4,
            teacher_dynamic: data.teacher_5,
            teacher_fairness: data.teacher_6,
            learning_motivation: data.learning_1,
            learning_critical_thinking: data.learning_2,
            learning_organization: data.learning_3,
            learning_interest: data.learning_4,
            learning_explanation: data.learning_5,
            learning_clarity: data.learning_6,
            learning_integration: data.learning_7,
            learning_mastery: data.learning_8,
            learning_methodology: data.learning_9,
            learning_values: data.learning_10,
            learning_grading: data.learning_11,
            learning_synthesis: data.learning_12,
            learning_reasonableness: data.learning_13,
            classroom_attendance: data.classroom_1,
            classroom_policies: data.classroom_2,
            classroom_discipline: data.classroom_3,
            classroom_authority: data.classroom_4,
            classroom_prayers: data.classroom_5,
            classroom_punctuality: data.classroom_6,
            comments: data.comments || '',
            ip_address: req.ip
        });
        
        await evaluation.save();
        
        res.json({ 
            success: true, 
            message: 'Evaluation submitted successfully!',
            id: evaluation._id
        });
    } catch (error) {
        console.error('Error submitting evaluation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit evaluation. Please try again.' 
        });
    }
});

// ==================== ADMIN ROUTES ====================

// Admin Login Page
app.get('/admin/login', isGuest, (req, res) => {
    res.render('admin/login');
});

// Admin Login POST
app.post('/admin/login', isGuest, async (req, res) => {
    try {
        // Initialize database if needed
        await initializeDatabase();
        
        const { username, password } = req.body;
        
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }
        
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (!isValid) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }
        
        // Update last login
        admin.last_login = new Date();
        await admin.save();
        
        // Set session
        req.session.adminId = admin._id.toString();
        req.session.username = admin.username;
        req.session.fullName = admin.full_name;
        
        // IMPORTANT: Explicitly save session before redirect in serverless
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error', 'An error occurred during login');
                return res.redirect('/admin/login');
            }
            req.flash('success', 'Welcome back, ' + admin.full_name);
            res.redirect('/admin/dashboard');
        });
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/admin/login');
    }
});

// Admin Dashboard
app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Initialize database if needed
        await initializeDatabase();
        
        // Get statistics
        const totalEvaluations = await Evaluation.countDocuments();
        const totalTeachers = await Teacher.countDocuments({ status: 'active' });
        const totalPrograms = await Program.countDocuments();
        
        // Get average ratings using aggregation
        const avgRatingsResult = await Evaluation.aggregate([
            {
                $group: {
                    _id: null,
                    avg_teacher_rating: {
                        $avg: {
                            $divide: [
                                { $add: ['$teacher_diction', '$teacher_grammar', '$teacher_personality', '$teacher_disposition', '$teacher_dynamic', '$teacher_fairness'] },
                                6
                            ]
                        }
                    },
                    avg_learning_rating: {
                        $avg: {
                            $divide: [
                                { $add: ['$learning_motivation', '$learning_critical_thinking', '$learning_organization', '$learning_interest', '$learning_explanation', '$learning_clarity', '$learning_integration', '$learning_mastery', '$learning_methodology', '$learning_values', '$learning_grading', '$learning_synthesis', '$learning_reasonableness'] },
                                13
                            ]
                        }
                    },
                    avg_classroom_rating: {
                        $avg: {
                            $divide: [
                                { $add: ['$classroom_attendance', '$classroom_policies', '$classroom_discipline', '$classroom_authority', '$classroom_prayers', '$classroom_punctuality'] },
                                6
                            ]
                        }
                    },
                    overall_avg: {
                        $avg: {
                            $divide: [
                                { $add: ['$teacher_diction', '$teacher_grammar', '$teacher_personality', '$teacher_disposition', '$teacher_dynamic', '$teacher_fairness', '$learning_motivation', '$learning_critical_thinking', '$learning_organization', '$learning_interest', '$learning_explanation', '$learning_clarity', '$learning_integration', '$learning_mastery', '$learning_methodology', '$learning_values', '$learning_grading', '$learning_synthesis', '$learning_reasonableness', '$classroom_attendance', '$classroom_policies', '$classroom_discipline', '$classroom_authority', '$classroom_prayers', '$classroom_punctuality'] },
                                25
                            ]
                        }
                    }
                }
            }
        ]);
        
        const avgRatings = avgRatingsResult[0] || { avg_teacher_rating: 0, avg_learning_rating: 0, avg_classroom_rating: 0, overall_avg: 0 };
        
        // Get evaluations by school year
        const evalsByYear = await Evaluation.aggregate([
            {
                $group: {
                    _id: '$school_year',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    school_year: '$_id',
                    count: 1
                }
            },
            { $sort: { school_year: -1 } }
        ]);
        
        // Get top 5 highest rated teachers
        const topTeachers = await Evaluation.aggregate([
            {
                $match: {
                    teacher_id: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$teacher_id',
                    eval_count: { $sum: 1 },
                    avg_rating: {
                        $avg: {
                            $divide: [
                                { $add: ['$teacher_diction', '$teacher_grammar', '$teacher_personality', '$teacher_disposition', '$teacher_dynamic', '$teacher_fairness', '$learning_motivation', '$learning_critical_thinking', '$learning_organization', '$learning_interest', '$learning_explanation', '$learning_clarity', '$learning_integration', '$learning_mastery', '$learning_methodology', '$learning_values', '$learning_grading', '$learning_synthesis', '$learning_reasonableness', '$classroom_attendance', '$classroom_policies', '$classroom_discipline', '$classroom_authority', '$classroom_prayers', '$classroom_punctuality'] },
                                25
                            ]
                        }
                    }
                }
            },
            { $match: { eval_count: { $gt: 0 } } },
            { $sort: { avg_rating: -1, eval_count: -1 } },
            { $limit: 5 }
        ]);
        
        // Populate teacher names
        for (let teacher of topTeachers) {
            const teacherDoc = await Teacher.findById(teacher._id);
            teacher.full_name = teacherDoc ? teacherDoc.full_name : 'Unknown';
        }
        
        // Get recent evaluations
        const recentEvaluations = await Evaluation.find()
            .populate('teacher_id', 'full_name')
            .populate('program_id', 'name')
            .populate('course_id', 'name')
            .sort({ submitted_at: -1 })
            .limit(10)
            .lean();
        
        // Transform for template
        const recentEvalsFormatted = recentEvaluations.map(e => ({
            ...e,
            teacher_name: e.teacher_id ? e.teacher_id.full_name : null,
            program_name: e.program_id ? e.program_id.name : null,
            course_name: e.course_id ? e.course_id.name : null
        }));
        
        res.render('admin/dashboard', {
            stats: {
                evaluations: totalEvaluations,
                teachers: totalTeachers,
                programs: totalPrograms
            },
            summary: {
                avgTeacherRating: Math.round(avgRatings.avg_teacher_rating * 100) / 100 || 0,
                avgLearningRating: Math.round(avgRatings.avg_learning_rating * 100) / 100 || 0,
                avgClassroomRating: Math.round(avgRatings.avg_classroom_rating * 100) / 100 || 0,
                overallAvg: Math.round(avgRatings.overall_avg * 100) / 100 || 0
            },
            evalsByYear,
            topTeachers,
            recentEvaluations: recentEvalsFormatted
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// View All Evaluations
app.get('/admin/evaluations', isAuthenticated, async (req, res) => {
    try {
        const evaluations = await Evaluation.find()
            .populate('teacher_id', 'full_name')
            .populate('program_id', 'name')
            .populate('course_id', 'name')
            .sort({ submitted_at: -1 })
            .lean();
        
        // Transform for template
        const evalsFormatted = evaluations.map(e => ({
            ...e,
            id: e._id.toString(),
            teacher_name: e.teacher_id ? e.teacher_id.full_name : null,
            program_name: e.program_id ? e.program_id.name : null,
            course_name: e.course_id ? e.course_id.name : null
        }));
        
        res.render('admin/evaluations', { evaluations: evalsFormatted });
    } catch (error) {
        console.error('Error loading evaluations:', error);
        res.status(500).send('Error loading evaluations');
    }
});

// View Single Evaluation
app.get('/admin/evaluations/:id', isAuthenticated, async (req, res) => {
    try {
        const evaluation = await Evaluation.findById(req.params.id)
            .populate('teacher_id', 'full_name email employee_id')
            .populate('course_id', 'name code')
            .populate('program_id', 'name code')
            .lean();
        
        if (!evaluation) {
            req.flash('error', 'Evaluation not found');
            return res.redirect('/admin/evaluations');
        }
        
        // Transform for template
        const evalFormatted = {
            ...evaluation,
            id: evaluation._id.toString(),
            teacher_name: evaluation.teacher_id ? evaluation.teacher_id.full_name : null,
            employee_id: evaluation.teacher_id ? evaluation.teacher_id.employee_id : null,
            program_name: evaluation.program_id ? evaluation.program_id.name : null,
            course_name: evaluation.course_id ? evaluation.course_id.name : null
        };
        
        res.render('admin/evaluation-detail', { evaluation: evalFormatted });
    } catch (error) {
        console.error('Error loading evaluation:', error);
        res.status(500).send('Error loading evaluation');
    }
});

// Manage Teachers
app.get('/admin/teachers', isAuthenticated, async (req, res) => {
    try {
        const teachers = await Teacher.find().sort({ full_name: 1 });
        res.render('admin/teachers', { teachers });
    } catch (error) {
        console.error('Error loading teachers:', error);
        res.status(500).send('Error loading teachers');
    }
});

// Manage Programs
app.get('/admin/programs', isAuthenticated, async (req, res) => {
    try {
        const programs = await Program.find().sort({ name: 1 });
        res.render('admin/programs', { programs });
    } catch (error) {
        console.error('Error loading programs:', error);
        res.status(500).send('Error loading programs');
    }
});

// Add Program
app.post('/admin/programs', isAuthenticated, async (req, res) => {
    try {
        const { name, code } = req.body;
        
        // Check for duplicate program name
        const existing = await Program.findOne({ name });
        
        if (existing) {
            req.flash('error', 'A program with this name already exists');
            return res.redirect('/admin/programs');
        }
        
        await Program.create({ name, code });
        req.flash('success', 'Program added successfully');
        res.redirect('/admin/programs');
    } catch (error) {
        console.error('Error adding program:', error);
        req.flash('error', 'Failed to add program');
        res.redirect('/admin/programs');
    }
});

// Update Program
app.post('/admin/programs/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, code } = req.body;
        await Program.findByIdAndUpdate(req.params.id, { name, code });
        req.flash('success', 'Program updated successfully');
        res.redirect('/admin/programs');
    } catch (error) {
        console.error('Error updating program:', error);
        req.flash('error', 'Failed to update program');
        res.redirect('/admin/programs');
    }
});

// Delete Program
app.post('/admin/programs/:id/delete', isAuthenticated, async (req, res) => {
    try {
        // Check if program has courses or evaluations
        const coursesCount = await Course.countDocuments({ program_id: req.params.id });
        const evaluationsCount = await Evaluation.countDocuments({ program_id: req.params.id });
        
        if (coursesCount > 0 || evaluationsCount > 0) {
            req.flash('error', 'Cannot delete program with existing courses or evaluations');
        } else {
            await Program.findByIdAndDelete(req.params.id);
            req.flash('success', 'Program deleted successfully');
        }
        res.redirect('/admin/programs');
    } catch (error) {
        console.error('Error deleting program:', error);
        req.flash('error', 'Failed to delete program');
        res.redirect('/admin/programs');
    }
});

// Add Teacher
app.post('/admin/teachers', isAuthenticated, async (req, res) => {
    try {
        const { full_name, employee_id, email, department } = req.body;
        
        // Check for duplicate employee ID
        if (employee_id) {
            const existing = await Teacher.findOne({ employee_id });
            
            if (existing) {
                req.flash('error', 'A teacher with this employee ID already exists');
                return res.redirect('/admin/teachers');
            }
        }
        
        await Teacher.create({ full_name, employee_id, email, department });
        req.flash('success', 'Teacher added successfully');
        res.redirect('/admin/teachers');
    } catch (error) {
        console.error('Error adding teacher:', error);
        req.flash('error', 'Failed to add teacher');
        res.redirect('/admin/teachers');
    }
});

// Update Teacher
app.post('/admin/teachers/:id', isAuthenticated, async (req, res) => {
    try {
        const { full_name, employee_id, email, department, status } = req.body;
        await Teacher.findByIdAndUpdate(req.params.id, { 
            full_name, 
            employee_id, 
            email, 
            department, 
            status 
        });
        req.flash('success', 'Teacher updated successfully');
        res.redirect('/admin/teachers');
    } catch (error) {
        console.error('Error updating teacher:', error);
        req.flash('error', 'Failed to update teacher');
        res.redirect('/admin/teachers');
    }
});

// Delete Teacher
app.post('/admin/teachers/:id/delete', isAuthenticated, async (req, res) => {
    try {
        // Set evaluations' teacher_id to NULL before deleting
        await Evaluation.updateMany(
            { teacher_id: req.params.id },
            { $set: { teacher_id: null } }
        );
        
        // Delete the teacher completely
        await Teacher.findByIdAndDelete(req.params.id);
        req.flash('success', 'Teacher removed successfully');
        
        res.redirect('/admin/teachers');
    } catch (error) {
        console.error('Error deleting teacher:', error);
        req.flash('error', 'Failed to remove teacher');
        res.redirect('/admin/teachers');
    }
});

// Manage Courses
app.get('/admin/courses', isAuthenticated, async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('program_id', 'name')
            .sort({ name: 1 })
            .lean();
        
        // Transform for template
        const coursesFormatted = courses.map(c => ({
            ...c,
            program_name: c.program_id ? c.program_id.name : null
        }));
        
        const programs = await Program.find().sort({ name: 1 });
        res.render('admin/courses', { courses: coursesFormatted, programs });
    } catch (error) {
        console.error('Error loading courses:', error);
        res.status(500).send('Error loading courses');
    }
});

// Add Course
app.post('/admin/courses', isAuthenticated, async (req, res) => {
    try {
        const { name, code, program_id } = req.body;
        
        // Check for duplicate course in the same program
        const existing = await Course.findOne({ name, program_id });
        
        if (existing) {
            req.flash('error', 'This course already exists in the selected program');
            return res.redirect('/admin/courses');
        }
        
        await Course.create({ name, code, program_id });
        req.flash('success', 'Course added successfully');
        res.redirect('/admin/courses');
    } catch (error) {
        console.error('Error adding course:', error);
        req.flash('error', 'Failed to add course');
        res.redirect('/admin/courses');
    }
});

// Update Course
app.post('/admin/courses/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, code, program_id } = req.body;
        await Course.findByIdAndUpdate(req.params.id, { name, code, program_id });
        req.flash('success', 'Course updated successfully');
        res.redirect('/admin/courses');
    } catch (error) {
        console.error('Error updating course:', error);
        req.flash('error', 'Failed to update course');
        res.redirect('/admin/courses');
    }
});

// Delete Course
app.post('/admin/courses/:id/delete', isAuthenticated, async (req, res) => {
    try {
        // Check if course has evaluations
        const evaluationsCount = await Evaluation.countDocuments({ course_id: req.params.id });
        
        if (evaluationsCount > 0) {
            req.flash('error', 'Cannot delete course with existing evaluations');
        } else {
            await Course.findByIdAndDelete(req.params.id);
            req.flash('success', 'Course deleted successfully');
        }
        res.redirect('/admin/courses');
    } catch (error) {
        console.error('Error deleting course:', error);
        req.flash('error', 'Failed to delete course');
        res.redirect('/admin/courses');
    }
});

// Privacy Audit
app.get('/admin/privacy-audit', isAuthenticated, async (req, res) => {
    try {
        const { runPrivacyAudit } = require('./utils/privacy-audit');
        const auditReport = await runPrivacyAudit();
        
        res.render('admin/privacy-audit', { auditReport });
    } catch (error) {
        console.error('Error running privacy audit:', error);
        req.flash('error', 'Failed to run privacy audit');
        res.redirect('/admin/dashboard');
    }
});

// Run Privacy Audit (API endpoint for manual triggers)
app.post('/admin/privacy-audit/run', isAuthenticated, async (req, res) => {
    try {
        const { runPrivacyAudit } = require('./utils/privacy-audit');
        const auditReport = await runPrivacyAudit();
        
        res.json({ 
            success: true, 
            report: auditReport 
        });
    } catch (error) {
        console.error('Error running privacy audit:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to run privacy audit',
            error: error.message
        });
    }
});

// Admin Logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// ==================== ERROR HANDLER ====================
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`✓ Server is running on http://localhost:${PORT}`);
        console.log(`✓ Admin login: http://localhost:${PORT}/admin/login`);
        console.log(`  Default credentials: admin / admin123`);
    });
}

// Export for Vercel
module.exports = app;
