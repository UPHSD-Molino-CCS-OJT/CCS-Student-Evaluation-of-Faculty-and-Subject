"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Only load dotenv in development, Vercel provides environment variables directly
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const connect_flash_1 = __importDefault(require("connect-flash"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
// Import Privacy Scheduler
const privacy_scheduler_1 = __importDefault(require("./utils/privacy-scheduler"));
// Import Database Initialization
const setup_db_mongodb_1 = require("./setup-db-mongodb");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
// Middleware
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
// Serve static files from public and frontend/dist (React build)
app.use(express_1.default.static('public'));
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'frontend', 'dist')));
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
        sessionConfig.store = connect_mongo_1.default.create({
            mongoUrl: process.env.MONGODB_URI,
            touchAfter: 24 * 3600,
            autoRemove: 'native'
        });
        console.log('✓ MongoDB session store configured');
    }
    catch (error) {
        const err = error;
        console.warn('Session store error:', err.message);
    }
}
app.use((0, express_session_1.default)(sessionConfig));
app.use((0, connect_flash_1.default)());
// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.admin = req.session.adminId ? { id: req.session.adminId, username: req.session.username } : null;
    next();
});
// Import and use API routes
const index_1 = __importDefault(require("./routes/index"));
app.use('/api', index_1.default);
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
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        mongodb: database_1.connection.readyState === 1 ? 'connected' : 'disconnected',
        env: process.env.NODE_ENV || 'development'
    });
});
// All other GET routes serve the React app (must be last)
app.get('*', async (_req, res) => {
    // Initialize database on first request (for Vercel serverless)
    await (0, setup_db_mongodb_1.initializeDatabase)();
    res.sendFile(path_1.default.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});
// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`✓ Server is running on http://localhost:${PORT}`);
        console.log(`✓ Admin login: http://localhost:${PORT}/admin/login`);
        // Initialize privacy protection scheduled tasks
        privacy_scheduler_1.default.initializeScheduledTasks();
    });
}
// Export for Vercel
exports.default = app;
//# sourceMappingURL=server.js.map