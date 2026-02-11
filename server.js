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

// Import Privacy Protection Utilities
const PrivacyProtection = require('./utils/privacy-protection');
const PrivacyScheduler = require('./utils/privacy-scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from public and client/dist (React build)
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'client', 'dist')));

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

// Import and use API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Legacy admin logout route (for compatibility)
app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.json({ success: true });
    });
});

// Legacy student logout route (for compatibility)
app.get('/student/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/student/login');
    });
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

// All other GET routes serve the React app (must be last)
app.get('*', async (req, res) => {
    // Initialize database on first request (for Vercel serverless)
    await initializeDatabase();
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`✓ Server is running on http://localhost:${PORT}`);
        console.log(`✓ Admin login: http://localhost:${PORT}/admin/login`);
        console.log(`  Default credentials: admin / admin123`);
        
        // Initialize privacy protection scheduled tasks
        PrivacyScheduler.initializeScheduledTasks();
    });
}

// Export for Vercel
module.exports = app;
