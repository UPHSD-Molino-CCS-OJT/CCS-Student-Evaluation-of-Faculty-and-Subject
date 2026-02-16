import { Router, Response } from 'express';
import Teacher from '../../models/Teacher';
import { IRequest } from '../../types';
import { findByEncryptedField, safeDecrypt } from '../../utils/encryption-helpers';

const router: Router = Router();

// Check if teacher is authenticated
router.get('/check-auth', (req: IRequest, res: Response): void => {
    res.json({ 
        authenticated: !!req.session.teacherId,
        teacher: req.session.teacherId ? {
            id: req.session.teacherId
        } : null
    });
});

// Teacher Login
router.post('/login', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { employee_id } = req.body;
        
        if (!employee_id) {
            res.status(400).json({ 
                success: false, 
                message: 'Please enter your Employee ID' 
            });
            return;
        }
        
        // Find teacher by encrypted employee_id field
        const teacher = await findByEncryptedField<typeof Teacher.prototype>(
            Teacher, 
            'employee_id', 
            employee_id
        );
        
        if (!teacher) {
            res.status(404).json({ 
                success: false, 
                message: 'Employee ID not found. Please check your ID and try again.' 
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
        
        // Store teacher ObjectId in session
        req.session.teacherId = teacher._id.toString();
        
        // Save session
        const saveSession = (retries = 3): void => {
            req.session.save((err?: Error) => {
                if (err) {
                    console.error(`Session save error (${4 - retries}/3 attempts):`, err.message);
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
                res.json({ success: true });
            });
        };
        saveSession();
    } catch (error) {
        console.error('Error during teacher login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again.' 
        });
    }
});

// Teacher Logout
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
