import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import Admin from '../../models/Admin';
import Teacher from '../../models/Teacher';
import { IRequest } from '../../types';
import { safeDecrypt, findByEncryptedField } from '../../utils/encryption-helpers';

const router: Router = Router();

/**
 * Unified Staff Login - Handles both Admin and Teacher authentication
 * Automatically detects user type based on credentials
 */
router.post('/login', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            res.status(400).json({ 
                success: false, 
                message: 'Please enter both username and password' 
            });
            return;
        }
        
        // Try to find admin first
        const admin = await findByEncryptedField<typeof Admin.prototype>(
            Admin, 
            'username', 
            username
        );
        
        if (admin) {
            // Verify admin password
            const isValidPassword = await bcrypt.compare(password, admin.password);
            
            if (!isValidPassword) {
                res.status(401).json({ 
                    success: false, 
                    message: 'Invalid username or password' 
                });
                return;
            }
            
            // Update last login
            admin.last_login = new Date();
            await admin.save();
            
            // Set admin session
            req.session.adminId = admin._id.toString();
            req.session.username = safeDecrypt(admin.username);
            req.session.fullName = safeDecrypt(admin.full_name);
            
            // Clear any teacher session data
            delete req.session.teacherId;
            
            // Save session
            const saveSession = (retries = 3): void => {
                req.session.save((err?: Error) => {
                    if (err) {
                        console.error(`Admin session save error (${4 - retries}/3 attempts):`, err.message);
                        if (retries > 1) {
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
                        userType: 'admin',
                        user: {
                            username: safeDecrypt(admin.username),
                            fullName: safeDecrypt(admin.full_name)
                        }
                    });
                });
            };
            saveSession();
            return;
        }
        
        // If not admin, try to find teacher
        const teacher = await findByEncryptedField<typeof Teacher.prototype>(
            Teacher, 
            'username', 
            username
        );
        
        if (teacher) {
            // Verify teacher password
            const isValidPassword = await bcrypt.compare(password, teacher.password);
            
            if (!isValidPassword) {
                res.status(401).json({ 
                    success: false, 
                    message: 'Invalid username or password' 
                });
                return;
            }
            
            // Check if teacher is active
            const status = safeDecrypt(teacher.status);
            if (status !== 'active') {
                res.status(403).json({ 
                    success: false, 
                    message: 'Your account is not active. Please contact the administrator.' 
                });
                return;
            }
            
            // Update last login
            teacher.last_login = new Date();
            await teacher.save();
            
            // Set teacher session
            req.session.teacherId = teacher._id.toString();
            
            // Clear any admin session data
            delete req.session.adminId;
            delete req.session.username;
            delete req.session.fullName;
            
            // Save session
            const saveSession = (retries = 3): void => {
                req.session.save((err?: Error) => {
                    if (err) {
                        console.error(`Teacher session save error (${4 - retries}/3 attempts):`, err.message);
                        if (retries > 1) {
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
                        userType: 'teacher',
                        user: {
                            fullName: safeDecrypt(teacher.full_name),
                            employeeId: safeDecrypt(teacher.employee_id)
                        }
                    });
                });
            };
            saveSession();
            return;
        }
        
        // If neither admin nor teacher found
        res.status(401).json({ 
            success: false, 
            message: 'Invalid username or password' 
        });
        
    } catch (error) {
        console.error('Error during staff login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again.' 
        });
    }
});

/**
 * Check authentication status
 * Returns user type and authentication state
 */
router.get('/check-auth', (req: IRequest, res: Response): void => {
    if (req.session.adminId) {
        res.json({ 
            authenticated: true,
            userType: 'admin',
            user: {
                id: req.session.adminId,
                username: req.session.username,
                fullName: req.session.fullName
            }
        });
    } else if (req.session.teacherId) {
        res.json({ 
            authenticated: true,
            userType: 'teacher',
            user: {
                id: req.session.teacherId
            }
        });
    } else {
        res.json({ 
            authenticated: false,
            userType: null,
            user: null
        });
    }
});

/**
 * Staff Logout - Clears both admin and teacher sessions
 */
router.post('/logout', (req: IRequest, res: Response): void => {
    req.session.destroy((err?: Error) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ success: false, message: 'Error logging out' });
            return;
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

export default router;
