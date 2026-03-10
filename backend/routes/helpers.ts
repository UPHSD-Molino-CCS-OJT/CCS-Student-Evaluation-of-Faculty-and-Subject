import { decryptField, EncryptedData } from '../utils/encryption';

/**
 * Helper: Decrypt comments field
 * Returns plaintext string from AES-256-GCM encrypted data
 */
export function decryptCommentsField(comments: any): string {
    if (!comments) {
        return '';
    }
    
    if (typeof comments === 'object' && comments.encrypted) {
        try {
            return decryptField(comments as EncryptedData);
        } catch (error) {
            console.error('Failed to decrypt comments:', error);
            return '[Decryption failed - invalid key or corrupted data]';
        }
    }
    
    return '';
}
