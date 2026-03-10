import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

/**
 * Upload Helpers for E-Signature Image Management
 * 
 * Provides utilities for processing and validating uploaded signature images.
 * Uses Sharp for image processing, validation, and optimization.
 * 
 * @module upload-helpers
 */

// Configuration
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_WIDTH = 400;
const MAX_HEIGHT = 150;

// Get upload directory from environment or use default
const UPLOAD_BASE_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || './uploads';
const SIGNATURES_DIR = path.join(UPLOAD_BASE_PATH, 'signatures');

/**
 * Ensure the signatures directory exists
 */
export function ensureSignaturesDirectory(): void {
  if (!fs.existsSync(SIGNATURES_DIR)) {
    fs.mkdirSync(SIGNATURES_DIR, { recursive: true });
  }
}

/**
 * Generate a unique filename for a signature
 * @param teacherId - The teacher's database ID
 * @returns Unique filename in format: signature_<teacherId>_<timestamp>.png
 */
export function generateSignatureFilename(teacherId: string): string {
  const timestamp = Date.now();
  return `signature_${teacherId}_${timestamp}.png`;
}

/**
 * Get the full path to a signature file
 * @param filename - The signature filename
 * @returns Full filesystem path to the signature file
 */
export function getSignaturePath(filename: string): string {
  return path.join(SIGNATURES_DIR, filename);
}

/**
 * Validate file type and size
 * @param file - Multer file object
 * @throws Error if validation fails
 */
export function validateSignatureFile(file: Express.Multer.File): void {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only PNG and JPEG images are allowed.');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }
}

/**
 * Process and optimize signature image using Sharp
 * Resizes to max dimensions, converts to PNG, and optimizes
 * 
 * @param inputPath - Path to the uploaded file
 * @param outputPath - Path where the processed image should be saved
 * @returns Promise that resolves when processing is complete
 */
export async function processSignatureImage(
  inputPath: string,
  outputPath: string
): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside', // Maintain aspect ratio, fit within bounds
        withoutEnlargement: true, // Don't upscale small images
      })
      .png({ quality: 90, compressionLevel: 9 }) // Convert to PNG with optimization
      .toFile(outputPath);
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a signature file from the filesystem
 * @param filename - The signature filename to delete
 * @returns Promise that resolves to true if deleted, false if file didn't exist
 */
export async function deleteSignatureFile(filename: string): Promise<boolean> {
  const filePath = getSignaturePath(filename);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting signature file:', error);
    return false;
  }
}

/**
 * Check if a signature file exists
 * @param filename - The signature filename to check
 * @returns True if the file exists
 */
export function signatureFileExists(filename: string): boolean {
  const filePath = getSignaturePath(filename);
  return fs.existsSync(filePath);
}

/**
 * Get signature file upload configuration
 */
export const uploadConfig = {
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  maxFileSize: MAX_FILE_SIZE,
  maxWidth: MAX_WIDTH,
  maxHeight: MAX_HEIGHT,
  signaturesDir: SIGNATURES_DIR,
};
