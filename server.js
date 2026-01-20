require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./config/database');
const { isAuthenticated, isGuest } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'uphsd_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

app.use(flash());

// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.admin = req.session.adminId ? { id: req.session.adminId, username: req.session.username } : null;
    next();
});

// ==================== PUBLIC ROUTES ====================

// Student Evaluation Form
app.get('/', async (req, res) => {
    try {
        const [programs] = await db.query('SELECT * FROM programs ORDER BY name');
        const [teachers] = await db.query('SELECT * FROM teachers WHERE status = "active" ORDER BY full_name');
        
        res.render('index', { 
            programs, 
            teachers 
        });
    } catch (error) {
        console.error('Error loading form:', error);
        res.status(500).send('Error loading evaluation form');
    }
});

// Get courses by program (AJAX)
app.get('/api/courses/:programId', async (req, res) => {
    try {
        const [courses] = await db.query(
            'SELECT * FROM courses WHERE program_id = ? ORDER BY name',
            [req.params.programId]
        );
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
        
        const [result] = await db.query(`
            INSERT INTO evaluations (
                school_year, student_number, program_id, year_level, status, course_id, teacher_id,
                teacher_diction, teacher_grammar, teacher_personality, teacher_disposition, 
                teacher_dynamic, teacher_fairness,
                learning_motivation, learning_critical_thinking, learning_organization, 
                learning_interest, learning_explanation, learning_clarity, learning_integration,
                learning_mastery, learning_methodology, learning_values, learning_grading,
                learning_synthesis, learning_reasonableness,
                classroom_attendance, classroom_policies, classroom_discipline, classroom_authority,
                classroom_prayers, classroom_punctuality,
                comments, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.schoolYear, data.studentNumber, data.program, data.yearLevel, 
            data.status, data.course, data.teacher,
            data.teacher_1, data.teacher_2, data.teacher_3, data.teacher_4, data.teacher_5, data.teacher_6,
            data.learning_1, data.learning_2, data.learning_3, data.learning_4, data.learning_5,
            data.learning_6, data.learning_7, data.learning_8, data.learning_9, data.learning_10,
            data.learning_11, data.learning_12, data.learning_13,
            data.classroom_1, data.classroom_2, data.classroom_3, data.classroom_4,
            data.classroom_5, data.classroom_6,
            data.comments || null,
            req.ip
        ]);
        
        res.json({ 
            success: true, 
            message: 'Evaluation submitted successfully!',
            id: result.insertId
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
        const { username, password } = req.body;
        
        const [admins] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
        
        if (admins.length === 0) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }
        
        const admin = admins[0];
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (!isValid) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/admin/login');
        }
        
        // Update last login
        await db.query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);
        
        // Set session
        req.session.adminId = admin.id;
        req.session.username = admin.username;
        req.session.fullName = admin.full_name;
        
        req.flash('success', 'Welcome back, ' + admin.full_name);
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/admin/login');
    }
});

// Admin Dashboard
app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Get statistics
        const [totalEvaluations] = await db.query('SELECT COUNT(*) as count FROM evaluations');
        const [totalTeachers] = await db.query('SELECT COUNT(*) as count FROM teachers WHERE status = "active"');
        const [totalPrograms] = await db.query('SELECT COUNT(*) as count FROM programs');
        
        // Get summary statistics
        const [avgRatings] = await db.query(`
            SELECT 
                ROUND(AVG((teacher_diction + teacher_grammar + teacher_personality + 
                          teacher_disposition + teacher_dynamic + teacher_fairness) / 6), 2) as avg_teacher_rating,
                ROUND(AVG((learning_motivation + learning_critical_thinking + learning_organization + 
                          learning_interest + learning_explanation + learning_clarity + learning_integration + 
                          learning_mastery + learning_methodology + learning_values + learning_grading + 
                          learning_synthesis + learning_reasonableness) / 13), 2) as avg_learning_rating,
                ROUND(AVG((classroom_attendance + classroom_policies + classroom_discipline + 
                          classroom_authority + classroom_prayers + classroom_punctuality) / 6), 2) as avg_classroom_rating,
                ROUND(AVG((teacher_diction + teacher_grammar + teacher_personality + teacher_disposition + 
                          teacher_dynamic + teacher_fairness + learning_motivation + learning_critical_thinking + 
                          learning_organization + learning_interest + learning_explanation + learning_clarity + 
                          learning_integration + learning_mastery + learning_methodology + learning_values + 
                          learning_grading + learning_synthesis + learning_reasonableness + classroom_attendance + 
                          classroom_policies + classroom_discipline + classroom_authority + classroom_prayers + 
                          classroom_punctuality) / 25), 2) as overall_avg
            FROM evaluations
        `);
        
        // Get evaluations by school year
        const [evalsByYear] = await db.query(`
            SELECT school_year, COUNT(*) as count 
            FROM evaluations 
            GROUP BY school_year 
            ORDER BY school_year DESC
        `);
        
        // Get top 5 highest rated teachers
        const [topTeachers] = await db.query(`
            SELECT 
                t.full_name,
                COUNT(e.id) as eval_count,
                ROUND(AVG((teacher_diction + teacher_grammar + teacher_personality + teacher_disposition + 
                          teacher_dynamic + teacher_fairness + learning_motivation + learning_critical_thinking + 
                          learning_organization + learning_interest + learning_explanation + learning_clarity + 
                          learning_integration + learning_mastery + learning_methodology + learning_values + 
                          learning_grading + learning_synthesis + learning_reasonableness + classroom_attendance + 
                          classroom_policies + classroom_discipline + classroom_authority + classroom_prayers + 
                          classroom_punctuality) / 25), 2) as avg_rating
            FROM evaluations e
            JOIN teachers t ON e.teacher_id = t.id
            GROUP BY t.id, t.full_name
            HAVING eval_count > 0
            ORDER BY avg_rating DESC, eval_count DESC
            LIMIT 5
        `);
        
        const [recentEvaluations] = await db.query(`
            SELECT e.*, t.full_name as teacher_name, p.name as program_name, c.name as course_name
            FROM evaluations e
            LEFT JOIN teachers t ON e.teacher_id = t.id
            LEFT JOIN programs p ON e.program_id = p.id
            LEFT JOIN courses c ON e.course_id = c.id
            ORDER BY e.submitted_at DESC
            LIMIT 10
        `);
        
        res.render('admin/dashboard', {
            stats: {
                evaluations: totalEvaluations[0].count,
                teachers: totalTeachers[0].count,
                programs: totalPrograms[0].count
            },
            summary: {
                avgTeacherRating: avgRatings[0].avg_teacher_rating || 0,
                avgLearningRating: avgRatings[0].avg_learning_rating || 0,
                avgClassroomRating: avgRatings[0].avg_classroom_rating || 0,
                overallAvg: avgRatings[0].overall_avg || 0
            },
            evalsByYear,
            topTeachers,
            recentEvaluations
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// View All Evaluations
app.get('/admin/evaluations', isAuthenticated, async (req, res) => {
    try {
        const [evaluations] = await db.query(`
            SELECT e.*, t.full_name as teacher_name, p.name as program_name, c.name as course_name
            FROM evaluations e
            LEFT JOIN teachers t ON e.teacher_id = t.id
            LEFT JOIN programs p ON e.program_id = p.id
            LEFT JOIN courses c ON e.course_id = c.id
            ORDER BY e.submitted_at DESC
        `);
        
        res.render('admin/evaluations', { evaluations });
    } catch (error) {
        console.error('Error loading evaluations:', error);
        res.status(500).send('Error loading evaluations');
    }
});

// View Single Evaluation
app.get('/admin/evaluations/:id', isAuthenticated, async (req, res) => {
    try {
        const [evaluations] = await db.query(`
            SELECT e.*, t.full_name as teacher_name, t.employee_id, 
                   p.name as program_name, c.name as course_name
            FROM evaluations e
            LEFT JOIN teachers t ON e.teacher_id = t.id
            LEFT JOIN programs p ON e.program_id = p.id
            LEFT JOIN courses c ON e.course_id = c.id
            WHERE e.id = ?
        `, [req.params.id]);
        
        if (evaluations.length === 0) {
            req.flash('error', 'Evaluation not found');
            return res.redirect('/admin/evaluations');
        }
        
        res.render('admin/evaluation-detail', { evaluation: evaluations[0] });
    } catch (error) {
        console.error('Error loading evaluation:', error);
        res.status(500).send('Error loading evaluation');
    }
});

// Manage Teachers
app.get('/admin/teachers', isAuthenticated, async (req, res) => {
    try {
        const [teachers] = await db.query('SELECT * FROM teachers ORDER BY full_name');
        res.render('admin/teachers', { teachers });
    } catch (error) {
        console.error('Error loading teachers:', error);
        res.status(500).send('Error loading teachers');
    }
});

// Manage Programs
app.get('/admin/programs', isAuthenticated, async (req, res) => {
    try {
        const [programs] = await db.query('SELECT * FROM programs ORDER BY name');
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
        await db.query(
            'INSERT INTO programs (name, code) VALUES (?, ?)',
            [name, code]
        );
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
        await db.query(
            'UPDATE programs SET name = ?, code = ? WHERE id = ?',
            [name, code, req.params.id]
        );
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
        const [courses] = await db.query('SELECT COUNT(*) as count FROM courses WHERE program_id = ?', [req.params.id]);
        const [evaluations] = await db.query('SELECT COUNT(*) as count FROM evaluations WHERE program_id = ?', [req.params.id]);
        
        if (courses[0].count > 0 || evaluations[0].count > 0) {
            req.flash('error', 'Cannot delete program with existing courses or evaluations');
        } else {
            await db.query('DELETE FROM programs WHERE id = ?', [req.params.id]);
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
        await db.query(
            'INSERT INTO teachers (full_name, employee_id, email, department) VALUES (?, ?, ?, ?)',
            [full_name, employee_id, email, department]
        );
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
        await db.query(
            'UPDATE teachers SET full_name = ?, employee_id = ?, email = ?, department = ?, status = ? WHERE id = ?',
            [full_name, employee_id, email, department, status, req.params.id]
        );
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
        // Check if teacher has evaluations
        const [evaluations] = await db.query('SELECT COUNT(*) as count FROM evaluations WHERE teacher_id = ?', [req.params.id]);
        
        if (evaluations[0].count > 0) {
            // Don't delete, just deactivate
            await db.query('UPDATE teachers SET status = "inactive" WHERE id = ?', [req.params.id]);
            req.flash('success', 'Teacher deactivated (has existing evaluations)');
        } else {
            // Safe to delete
            await db.query('DELETE FROM teachers WHERE id = ?', [req.params.id]);
            req.flash('success', 'Teacher deleted successfully');
        }
        res.redirect('/admin/teachers');
    } catch (error) {
        console.error('Error deleting teacher:', error);
        req.flash('error', 'Failed to delete teacher');
        res.redirect('/admin/teachers');
    }
});

// Manage Courses
app.get('/admin/courses', isAuthenticated, async (req, res) => {
    try {
        const [courses] = await db.query(`
            SELECT c.*, p.name as program_name 
            FROM courses c 
            LEFT JOIN programs p ON c.program_id = p.id 
            ORDER BY p.name, c.name
        `);
        const [programs] = await db.query('SELECT * FROM programs ORDER BY name');
        res.render('admin/courses', { courses, programs });
    } catch (error) {
        console.error('Error loading courses:', error);
        res.status(500).send('Error loading courses');
    }
});

// Add Course
app.post('/admin/courses', isAuthenticated, async (req, res) => {
    try {
        const { name, code, program_id } = req.body;
        await db.query(
            'INSERT INTO courses (name, code, program_id) VALUES (?, ?, ?)',
            [name, code, program_id]
        );
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
        await db.query(
            'UPDATE courses SET name = ?, code = ?, program_id = ? WHERE id = ?',
            [name, code, program_id, req.params.id]
        );
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
        const [evaluations] = await db.query('SELECT COUNT(*) as count FROM evaluations WHERE course_id = ?', [req.params.id]);
        
        if (evaluations[0].count > 0) {
            req.flash('error', 'Cannot delete course with existing evaluations');
        } else {
            await db.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
            req.flash('success', 'Course deleted successfully');
        }
        res.redirect('/admin/courses');
    } catch (error) {
        console.error('Error deleting course:', error);
        req.flash('error', 'Failed to delete course');
        res.redirect('/admin/courses');
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

app.listen(PORT, () => {
    console.log(`✓ Server is running on http://localhost:${PORT}`);
    console.log(`✓ Admin login: http://localhost:${PORT}/admin/login`);
    console.log(`  Default credentials: admin / admin123`);
});
