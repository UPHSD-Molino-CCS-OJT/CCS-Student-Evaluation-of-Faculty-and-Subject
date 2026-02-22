// Only load dotenv in development, Vercel provides environment variables directly
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '.env') });
}

import express, { Application, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import flash from 'connect-flash';
import path from 'path';
import { connection as db } from './config/database';
import { IRequest } from './types';

// Import Privacy Scheduler
import PrivacyScheduler from './utils/privacy-scheduler';

// Import Database Initialization
import { initializeDatabase } from './setup-db-mongodb';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from public and frontend/dist (React build)
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Session configuration with MongoDB store for Vercel compatibility
// IMPORTANT: For serverless, session store may not be ready on first request
// Session configuration optimized for Vercel serverless
const sessionConfig: session.SessionOptions = {
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
        const err = error as Error;
        console.warn('Session store error:', err.message);
    }
}

app.use(session(sessionConfig));

app.use(flash());

// Global variables for templates
app.use((req: IRequest, res: Response, next: NextFunction): void => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.admin = req.session.adminId ? { id: req.session.adminId, username: req.session.username } : null;
    next();
});

// Import and use API routes
import apiRoutes from './routes/index';
app.use('/api', apiRoutes);

// Legacy admin logout route (for compatibility)
app.get('/admin/logout', (req: IRequest, res: Response): void => {
    req.session.destroy((err?: Error) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.json({ success: true });
    });
});

// Legacy student logout route (for compatibility)
app.get('/student/logout', (req: IRequest, res: Response): void => {
    req.session.destroy((err?: Error) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/student/login');
    });
});

// ==================== PUBLIC ROUTES ====================

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response): void => {
    res.json({ 
        status: 'ok', 
        mongodb: db.readyState === 1 ? 'connected' : 'disconnected',
        env: process.env.NODE_ENV || 'development'
    });
});

// All other GET routes serve the React app (must be last)
app.get('*', async (_req: Request, res: Response): Promise<void> => {
    // Initialize database on first request (for Vercel serverless)
    await initializeDatabase();
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, (): void => {
        console.log(`✓ Server is running on http://localhost:${PORT}`);
        console.log(`✓ Admin login: http://localhost:${PORT}/admin/login`);
        
        // Initialize privacy protection scheduled tasks
        PrivacyScheduler.initializeScheduledTasks();
    });
}

// Export for Vercel
export default app;
