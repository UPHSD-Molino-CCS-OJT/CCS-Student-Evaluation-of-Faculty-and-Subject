import { Router, Response } from 'express';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';
import Teacher from '../../models/Teacher';
import { IRequest } from '../../types';
import { isTeacherAuthenticated } from '../../middleware/auth';
import { signatureUpload, handleUploadError } from '../../middleware/upload';
import {
  generateSignatureFilename,
  getSignaturePath,
  validateSignatureFile,
  processSignatureImage,
  deleteSignatureFile,
  signatureFileExists,
} from '../../utils/upload-helpers';
import { safeEncrypt, safeDecrypt } from '../../utils/encryption-helpers';

const router: Router = Router();

/**
 * GET /api/teacher/profile
 * Get teacher profile information including signature metadata
 */
router.get('/profile', isTeacherAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
  try {
    if (!req.session.teacherId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const teacherId = new Types.ObjectId(req.session.teacherId);
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      res.status(404).json({ success: false, message: 'Teacher not found' });
      return;
    }

    // Decrypt fields for display
    const profile = {
      _id: teacher._id,
      full_name: safeDecrypt(teacher.full_name),
      employee_id: safeDecrypt(teacher.employee_id),
      username: safeDecrypt(teacher.username),
      email: safeDecrypt(teacher.email),
      department: safeDecrypt(teacher.department),
      status: safeDecrypt(teacher.status),
      signature_filename: teacher.signature_filename ? safeDecrypt(teacher.signature_filename) : null,
      signature_uploaded_at: teacher.signature_uploaded_at || null,
      last_login: teacher.last_login,
    };

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
});

/**
 * POST /api/teacher/profile/signature
 * Upload or replace teacher's e-signature image
 */
router.post(
  '/profile/signature',
  isTeacherAuthenticated,
  signatureUpload.single('signature'),
  handleUploadError,
  async (req: IRequest, res: Response): Promise<void> => {
    try {
      if (!req.session.teacherId) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const teacherId = req.session.teacherId;
      const teacher = await Teacher.findById(teacherId);

      if (!teacher) {
        res.status(404).json({ success: false, message: 'Teacher not found' });
        return;
      }

      // Validate the uploaded file
      try {
        validateSignatureFile(req.file);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Invalid file',
        });
        return;
      }

      // Generate unique filename
      const newFilename = generateSignatureFilename(teacherId);
      const outputPath = getSignaturePath(newFilename);

      // Create a temporary file from the buffer
      const tempPath = path.join('/tmp', `temp_${Date.now()}_${req.file.originalname}`);
      fs.writeFileSync(tempPath, req.file.buffer);

      try {
        // Process and optimize the image
        await processSignatureImage(tempPath, outputPath);

        // Delete old signature file if exists
        if (teacher.signature_filename) {
          const oldFilename = safeDecrypt(teacher.signature_filename);
          if (oldFilename) {
            await deleteSignatureFile(oldFilename);
          }
        }

        // Update teacher record with encrypted filename
        teacher.signature_filename = safeEncrypt(newFilename);
        teacher.signature_uploaded_at = new Date();
        await teacher.save();

        res.json({
          success: true,
          message: 'Signature uploaded successfully',
          signature: {
            filename: newFilename,
            uploaded_at: teacher.signature_uploaded_at,
          },
        });
      } catch (error) {
        console.error('Error processing signature:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to process signature image',
        });
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    } catch (error) {
      console.error('Error uploading signature:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload signature',
      });
    }
  }
);

/**
 * GET /api/teacher/profile/signature/metadata
 * Get signature metadata without the actual image
 */
router.get('/profile/signature/metadata', isTeacherAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
  try {
    if (!req.session.teacherId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const teacherId = new Types.ObjectId(req.session.teacherId);
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      res.status(404).json({ success: false, message: 'Teacher not found' });
      return;
    }

    if (!teacher.signature_filename) {
      res.json({
        success: true,
        hasSignature: false,
        signature: null,
      });
      return;
    }

    const filename = safeDecrypt(teacher.signature_filename);
    const exists = filename ? signatureFileExists(filename) : false;

    res.json({
      success: true,
      hasSignature: exists,
      signature: exists
        ? {
            filename,
            uploaded_at: teacher.signature_uploaded_at,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching signature metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signature metadata',
    });
  }
});

/**
 * DELETE /api/teacher/profile/signature
 * Delete teacher's signature
 */
router.delete('/profile/signature', isTeacherAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
  try {
    if (!req.session.teacherId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const teacherId = new Types.ObjectId(req.session.teacherId);
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      res.status(404).json({ success: false, message: 'Teacher not found' });
      return;
    }

    if (!teacher.signature_filename) {
      res.json({
        success: true,
        message: 'No signature to delete',
      });
      return;
    }

    // Delete the file
    const filename = safeDecrypt(teacher.signature_filename);
    if (filename) {
      await deleteSignatureFile(filename);
    }

    // Clear database fields
    teacher.signature_filename = undefined;
    teacher.signature_uploaded_at = undefined;
    await teacher.save();

    res.json({
      success: true,
      message: 'Signature deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting signature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete signature',
    });
  }
});

/**
 * GET /api/uploads/signatures/:filename
 * Serve signature image file (with authentication)
 */
router.get('/uploads/signatures/:filename', isTeacherAuthenticated, async (req: IRequest, res: Response): Promise<void> => {
  try {
    if (!req.session.teacherId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { filename } = req.params;
    const teacherId = req.session.teacherId;

    // Security check: Verify the filename belongs to this teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.signature_filename) {
      res.status(404).json({ success: false, message: 'Signature not found' });
      return;
    }

    const teacherFilename = safeDecrypt(teacher.signature_filename);
    if (teacherFilename !== filename) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Serve the file
    const filePath = getSignaturePath(filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'Signature file not found' });
      return;
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving signature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve signature',
    });
  }
});

export default router;
