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

// Import Database Initialization
const { initializeDatabase } = require('./setup-db-mongodb');

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
