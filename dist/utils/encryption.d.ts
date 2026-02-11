/**
 * Encrypted data structure with metadata
 */
export interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
    encryptedDek: string;
    dekIv: string;
    version: string;
}
/**
 * Encrypt data using envelope encryption pattern
 *
 * @param plaintext - Data to encrypt (string)
 * @returns Encrypted data structure with all metadata
 */
export declare function encryptField(plaintext: string): EncryptedData;
/**
 * Decrypt data using envelope encryption pattern
 *
 * @param data - Encrypted data structure
 * @returns Decrypted plaintext
 */
export declare function decryptField(data: EncryptedData): string;
/**
 * Check if encryption is properly configured
 */
export declare function isEncryptionConfigured(): boolean;
/**
 * Generate a new master key (for initial setup)
 * Usage: node -e "console.log(require('./dist/utils/encryption').generateMasterKey())"
 */
export declare function generateMasterKey(): string;
/**
 * Encrypt multiple fields in an object
 */
export declare function encryptFields(obj: Record<string, any>, fields: string[]): Record<string, any>;
/**
 * Decrypt multiple fields in an object
 */
export declare function decryptFields(obj: Record<string, any>, fields: string[]): Record<string, any>;
//# sourceMappingURL=encryption.d.ts.map