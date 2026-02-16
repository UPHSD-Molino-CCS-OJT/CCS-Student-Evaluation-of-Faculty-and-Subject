import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import Admin from '../../models/Admin';
import Student from '../../models/Student';
import { IRequest } from '../../types';
import { safeDecrypt, findByEncryptedField } from '../../utils/encryption-helpers';

const router: Router = Router();

// Check if admin is authenticated
router.get('/check-auth', (req: IRequest, res: Response): void => {
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
router.get('/test/students', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
        
        // Fetch all students (cannot sort by encrypted field in database)
        const students = await Student.find().select('student_number');
        
        // Decrypt and prepare students for response
        const decryptedStudents = students.map(s => ({
            student_number: safeDecrypt(s.student_number),
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
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students for testing' });
    }
});

// Admin Login
router.post('/login', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;
        
        // Find admin by encrypted username field
        // Must fetch and decrypt because username is encrypted at rest
        const admin = await findByEncryptedField<typeof Admin.prototype>(
            Admin, 
            'username', 
            username
        );
        
        if (!admin) {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
            return;
        }
        
        const isValid = await bcrypt.compare(password, admin.password);
        
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
        req.session.username = safeDecrypt(admin.username);
        req.session.fullName = safeDecrypt(admin.full_name);
        
        // Save session with retry mechanism (helps during parallel testing)
        const saveSession = (retries = 3): void => {
            req.session.save((err?: Error) => {
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
                        username: safeDecrypt(admin.username),
                        fullName: safeDecrypt(admin.full_name)
                    } 
                });
            });
        };
        saveSession();
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred during login' 
        });
    }
});

export default router;
