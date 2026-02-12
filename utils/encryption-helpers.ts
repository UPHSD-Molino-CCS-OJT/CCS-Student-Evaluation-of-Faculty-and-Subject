/**
 * Encryption Helper Utilities
 * 
 * Helper functions to simplify working with encrypted fields in the application.
 * Provides safe decryption with fallbacks for both encrypted and plaintext data.
 */

import { encryptField, decryptField, EncryptedData } from './encryption';

/**
 * Safely decrypt a field that may be encrypted or plaintext
 * Returns plaintext string in either case
 */
export function safeDecrypt(value: any): string {
    if (!value) return '';
    
    // Already plaintext
    if (typeof value === 'string') return value;
    
    // Encrypted object
    if (typeof value === 'object' && value.encrypted) {
        try {
            return decryptField(value as EncryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '[Decryption Error]';
        }
    }
    
    // Unknown format
    return String(value);
}

/**
 * Safely encrypt a field that may already be encrypted
 * Returns encrypted data in either case
 */
export function safeEncrypt(value: any): EncryptedData | string {
    if (!value) return '';
    
    // Already encrypted
    if (typeof value === 'object' && value.encrypted) {
        return value as EncryptedData;
    }
    
    // Plaintext - encrypt it
    if (typeof value === 'string') {
        try {
            return encryptField(value);
        } catch (error) {
            console.error('Encryption failed:', error);
            return value; // Return plaintext on error
        }
    }
    
    return value;
}

/**
 * Decrypt all specified fields in a document
 * Returns a new object with decrypted fields
 */
export function decryptDocument<T extends Record<string, any>>(
    doc: T,
    fields: (keyof T)[]
): T {
    const result = { ...doc };
    
    for (const field of fields) {
        if (doc[field]) {
            result[field] = safeDecrypt(doc[field]) as any;
        }
    }
    
    return result;
}

/**
 * Encrypt all specified fields in a document
 * Returns a new object with encrypted fields
 */
export function encryptDocument<T extends Record<string, any>>(
    doc: T,
    fields: (keyof T)[]
): T {
    const result = { ...doc };
    
    for (const field of fields) {
        if (doc[field]) {
            result[field] = safeEncrypt(doc[field]) as any;
        }
    }
    
    return result;
}

/**
 * Decrypt multiple documents
 * Useful for processing query results
 */
export function decryptDocuments<T extends Record<string, any>>(
    docs: T[],
    fields: (keyof T)[]
): T[] {
    return docs.map(doc => decryptDocument(doc, fields));
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: any): value is EncryptedData {
    return value && 
           typeof value === 'object' && 
           value.encrypted && 
           value.iv && 
           value.authTag;
}

/**
 * Decrypt admin fields for display
 */
export function decryptAdmin(admin: any) {
    return decryptDocument(admin, ['username', 'full_name', 'email']);
}

/**
 * Decrypt course fields for display
 */
export function decryptCourse(course: any) {
    return decryptDocument(course, ['name', 'code']);
}

/**
 * Decrypt enrollment fields for display
 */
export function decryptEnrollment(enrollment: any) {
    return decryptDocument(enrollment, ['section_code', 'school_year', 'semester']);
}

/**
 * Decrypt evaluation fields for display
 */
export function decryptEvaluation(evaluation: any) {
    return decryptDocument(evaluation, ['school_year', 'year_level', 'status']);
}

/**
 * Decrypt program fields for display
 */
export function decryptProgram(program: any) {
    return decryptDocument(program, ['name', 'code']);
}

/**
 * Decrypt student fields for display
 */
export function decryptStudent(student: any) {
    return decryptDocument(student, [
        'student_number', 
        'full_name', 
        'email', 
        'year_level', 
        'section', 
        'status'
    ]);
}

/**
 * Decrypt teacher fields for display
 */
export function decryptTeacher(teacher: any) {
    return decryptDocument(teacher, [
        'full_name', 
        'employee_id', 
        'email', 
        'department', 
        'status'
    ]);
}

/**
 * Prepare document for API response (decrypt sensitive fields)
 * Returns a plain object (not Mongoose document) with decrypted fields
 */
export function prepareForResponse<T extends Record<string, any>>(
    doc: T,
    encryptedFields: (keyof T)[]
): any {
    // Convert to plain object if it's a Mongoose document
    const plainDoc = doc.toObject ? doc.toObject() : { ...doc };
    
    // Decrypt specified fields
    return decryptDocument(plainDoc, encryptedFields);
}

/**
 * Batch prepare multiple documents for API response
 */
export function prepareArrayForResponse<T extends Record<string, any>>(
    docs: T[],
    encryptedFields: (keyof T)[]
): any[] {
    return docs.map(doc => prepareForResponse(doc, encryptedFields));
}
