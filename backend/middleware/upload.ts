import multer from 'multer';
import { Request } from 'express';
import { ensureSignaturesDirectory, uploadConfig } from '../utils/upload-helpers';

/**
 * Multer Middleware Configuration for Signature Uploads
 * 
 * Handles file upload validation and temporary storage before processing.
 * Files are initially stored in memory, then processed and saved to disk.
 */

// Ensure upload directory exists on startup
ensureSignaturesDirectory();

/**
 * Memory storage for initial upload (files processed before saving)
 */
const storage = multer.memoryStorage();

/**
 * File filter to validate uploads
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  if (uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG and JPEG images are allowed.'));
  }
};

/**
 * Multer upload configuration for signature images
 */
export const signatureUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadConfig.maxFileSize,
    files: 1, // Only one file at a time
  },
});

/**
 * Middleware to handle multer errors
 */
export const handleUploadError = (err: any, _req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${uploadConfig.maxFileSize / (1024 * 1024)}MB.`,
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "signature" as the field name.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  } else if (err) {
    // Other errors (e.g., from fileFilter)
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed.',
    });
  }
  next();
};
