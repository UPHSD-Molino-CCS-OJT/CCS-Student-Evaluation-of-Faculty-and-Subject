import { Router, Response } from 'express';
import Student from '../../models/Student';
import { IRequest } from '../../types';
import { findByEncryptedField } from '../../utils/encryption-helpers';

const router: Router = Router();

// Check if student is authenticated
router.get('/check-auth', (req: IRequest, res: Response): void => {
    res.json({ 
        authenticated: !!req.session.studentId,
        student: req.session.studentId ? {
            id: req.session.studentId
        } : null
    });
});

// Student Login
router.post('/login', async (req: IRequest, res: Response): Promise<void> => {
    try {
        const { student_number } = req.body;
        
        if (!student_number) {
            res.status(400).json({ 
                success: false, 
                message: 'Please enter your School ID' 
            });
            return;
        }
        
        // Find student by encrypted student_number field
        // Must fetch and decrypt because student_number is encrypted at rest
        const student = await findByEncryptedField<typeof Student.prototype>(
            Student, 
            'student_number', 
            student_number
        );
        
        // Populate program_id after finding the student
        if (student) {
            await student.populate('program_id');
        }
        
        if (!student) {
            res.status(404).json({ 
                success: false, 
                message: 'School ID not found. Please check your ID and try again.' 
            });
            return;
        }
        
        // Store ONLY student ObjectId in session (never student_number for privacy)
        req.session.studentId = student._id.toString();
        
        // Save session with retry mechanism (helps during parallel testing)
        const saveSession = (retries = 3): void => {
            req.session.save((err?: Error) => {
                if (err) {
                    console.error(`Session save error (${4 - retries}/3 attempts):`, err.message);
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
                res.json({ success: true });
            });
        };
        saveSession();
    } catch (error) {
        console.error('Error during student login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again.' 
        });
    }
});

export default router;
