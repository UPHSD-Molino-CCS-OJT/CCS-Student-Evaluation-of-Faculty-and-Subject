"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptField = encryptField;
exports.decryptField = decryptField;
exports.isEncryptionConfigured = isEncryptionConfigured;
exports.generateMasterKey = generateMasterKey;
exports.encryptFields = encryptFields;
exports.decryptFields = decryptFields;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Field-Level Encryption Utility (AES-256-GCM with Envelope Encryption)
 *
 * Security Features:
 * - AES-256-GCM encryption for authenticated encryption
 * - Envelope encryption: Each record has unique DEK (Data Encryption Key)
 * - DEKs are encrypted with master KEK (Key Encryption Key)
 * - Even if DB is breached, comments remain encrypted
 * - DB admins cannot casually browse evaluation comments
 *
 * Threat Model Protection:
 * ✓ MongoDB breach / backup leak
 * ✓ Database administrator access
 * ✓ Disk/snapshot theft
 * ✓ Insider threat (requires both DB access AND server access)
 */
// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits
/**
 * Get master KEK (Key Encryption Key) from environment
 */
function getMasterKey() {
    const key = process.env.ENCRYPTION_MASTER_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_MASTER_KEY not configured. Set this environment variable for field-level encryption.');
    }
    // Key must be 64 hex characters (32 bytes = 256 bits)
    if (key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key)) {
        throw new Error('ENCRYPTION_MASTER_KEY must be 64 hex characters (256-bit key).');
    }
    return Buffer.from(key, 'hex');
}
/**
 * Generate a random data encryption key (DEK)
 */
function generateDEK() {
    return crypto_1.default.randomBytes(KEY_LENGTH);
}
/**
 * Encrypt DEK with master KEK using AES-256-GCM
 */
function encryptDEK(dek, masterKey) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, masterKey, iv);
    const encrypted = Buffer.concat([
        cipher.update(dek),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    return { encrypted, iv, authTag };
}
/**
 * Decrypt DEK with master KEK using AES-256-GCM
 */
function decryptDEK(encrypted, iv, authTag, masterKey) {
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);
}
/**
 * Encrypt data using envelope encryption pattern
 *
 * @param plaintext - Data to encrypt (string)
 * @returns Encrypted data structure with all metadata
 */
function encryptField(plaintext) {
    if (!plaintext) {
        throw new Error('Cannot encrypt empty data');
    }
    try {
        const masterKey = getMasterKey();
        // Step 1: Generate unique DEK for this record
        const dek = generateDEK();
        // Step 2: Encrypt plaintext with DEK
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, dek, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        // Step 3: Encrypt DEK with master KEK (envelope encryption)
        const { encrypted: encryptedDek, iv: dekIv, authTag: dekAuthTag } = encryptDEK(dek, masterKey);
        // Step 4: Return all components (DEK is encrypted, plaintext is encrypted)
        return {
            encrypted: encrypted.toString('base64'),
            iv: iv.toString('base64'),
            authTag: Buffer.concat([authTag, dekAuthTag]).toString('base64'), // Combine auth tags
            encryptedDek: encryptedDek.toString('base64'),
            dekIv: dekIv.toString('base64'),
            version: '1.0'
        };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
        throw new Error('Encryption failed: Unknown error');
    }
}
/**
 * Decrypt data using envelope encryption pattern
 *
 * @param data - Encrypted data structure
 * @returns Decrypted plaintext
 */
function decryptField(data) {
    if (!data || !data.encrypted || !data.encryptedDek) {
        throw new Error('Invalid encrypted data structure');
    }
    try {
        const masterKey = getMasterKey();
        // Step 1: Decrypt DEK with master KEK
        const encryptedDek = Buffer.from(data.encryptedDek, 'base64');
        const dekIv = Buffer.from(data.dekIv, 'base64');
        // Split combined auth tags (first 16 bytes for data, next 16 for DEK)
        const combinedAuthTags = Buffer.from(data.authTag, 'base64');
        const authTag = combinedAuthTags.subarray(0, AUTH_TAG_LENGTH);
        const dekAuthTag = combinedAuthTags.subarray(AUTH_TAG_LENGTH);
        const dek = decryptDEK(encryptedDek, dekIv, dekAuthTag, masterKey);
        // Step 2: Decrypt plaintext with DEK
        const encrypted = Buffer.from(data.encrypted, 'base64');
        const iv = Buffer.from(data.iv, 'base64');
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, dek, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
        throw new Error('Decryption failed: Unknown error');
    }
}
/**
 * Check if encryption is properly configured
 */
function isEncryptionConfigured() {
    try {
        getMasterKey();
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Generate a new master key (for initial setup)
 * Usage: node -e "console.log(require('./dist/utils/encryption').generateMasterKey())"
 */
function generateMasterKey() {
    return crypto_1.default.randomBytes(KEY_LENGTH).toString('hex');
}
/**
 * Encrypt multiple fields in an object
 */
function encryptFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
        if (obj[field] && typeof obj[field] === 'string') {
            result[field] = encryptField(obj[field]);
        }
    }
    return result;
}
/**
 * Decrypt multiple fields in an object
 */
function decryptFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
        if (obj[field] && typeof obj[field] === 'object' && obj[field].encrypted) {
            result[field] = decryptField(obj[field]);
        }
    }
    return result;
}
//# sourceMappingURL=encryption.js.map