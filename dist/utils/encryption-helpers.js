"use strict";
/**
 * Encryption Helper Utilities
 *
 * Helper functions to simplify working with encrypted fields in the application.
 * Provides safe decryption with fallbacks for both encrypted and plaintext data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeDecrypt = safeDecrypt;
exports.safeEncrypt = safeEncrypt;
exports.decryptDocument = decryptDocument;
exports.encryptDocument = encryptDocument;
exports.decryptDocuments = decryptDocuments;
exports.isEncrypted = isEncrypted;
exports.decryptAdmin = decryptAdmin;
exports.decryptCourse = decryptCourse;
exports.decryptEnrollment = decryptEnrollment;
exports.decryptEvaluation = decryptEvaluation;
exports.decryptProgram = decryptProgram;
exports.decryptStudent = decryptStudent;
exports.decryptTeacher = decryptTeacher;
exports.prepareForResponse = prepareForResponse;
exports.prepareArrayForResponse = prepareArrayForResponse;
exports.findByEncryptedField = findByEncryptedField;
exports.findAllByEncryptedField = findAllByEncryptedField;
const encryption_1 = require("./encryption");
/**
 * Safely decrypt a field that may be encrypted or plaintext
 * Returns plaintext string in either case
 */
function safeDecrypt(value) {
    if (!value)
        return '';
    // Already plaintext
    if (typeof value === 'string')
        return value;
    // Encrypted object
    if (typeof value === 'object' && value.encrypted) {
        try {
            return (0, encryption_1.decryptField)(value);
        }
        catch (error) {
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
function safeEncrypt(value) {
    if (!value)
        return '';
    // Already encrypted
    if (typeof value === 'object' && value.encrypted) {
        return value;
    }
    // Plaintext - encrypt it
    if (typeof value === 'string') {
        try {
            return (0, encryption_1.encryptField)(value);
        }
        catch (error) {
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
function decryptDocument(doc, fields) {
    const result = { ...doc };
    for (const field of fields) {
        if (doc[field]) {
            result[field] = safeDecrypt(doc[field]);
        }
    }
    return result;
}
/**
 * Encrypt all specified fields in a document
 * Returns a new object with encrypted fields
 */
function encryptDocument(doc, fields) {
    const result = { ...doc };
    for (const field of fields) {
        if (doc[field]) {
            result[field] = safeEncrypt(doc[field]);
        }
    }
    return result;
}
/**
 * Decrypt multiple documents
 * Useful for processing query results
 */
function decryptDocuments(docs, fields) {
    return docs.map(doc => decryptDocument(doc, fields));
}
/**
 * Check if a value is encrypted
 */
function isEncrypted(value) {
    return value &&
        typeof value === 'object' &&
        value.encrypted &&
        value.iv &&
        value.authTag;
}
/**
 * Decrypt admin fields for display
 */
function decryptAdmin(admin) {
    return decryptDocument(admin, ['username', 'full_name', 'email']);
}
/**
 * Decrypt course fields for display
 */
function decryptCourse(course) {
    return decryptDocument(course, ['name', 'code']);
}
/**
 * Decrypt enrollment fields for display
 */
function decryptEnrollment(enrollment) {
    return decryptDocument(enrollment, ['section_code', 'school_year', 'semester']);
}
/**
 * Decrypt evaluation fields for display
 */
function decryptEvaluation(evaluation) {
    return decryptDocument(evaluation, ['school_year', 'year_level', 'status']);
}
/**
 * Decrypt program fields for display
 */
function decryptProgram(program) {
    return decryptDocument(program, ['name', 'code']);
}
/**
 * Decrypt student fields for display
 */
function decryptStudent(student) {
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
function decryptTeacher(teacher) {
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
function prepareForResponse(doc, encryptedFields) {
    // Convert to plain object if it's a Mongoose document
    const plainDoc = doc.toObject ? doc.toObject() : { ...doc };
    // Decrypt specified fields
    return decryptDocument(plainDoc, encryptedFields);
}
/**
 * Batch prepare multiple documents for API response
 */
function prepareArrayForResponse(docs, encryptedFields) {
    return docs.map(doc => prepareForResponse(doc, encryptedFields));
}
/**
 * Find a document by matching an encrypted field against plaintext value
 * This is necessary because you cannot query encrypted fields directly
 *
 * @param Model - Mongoose model to query
 * @param fieldName - The encrypted field to search (e.g., 'username', 'student_number')
 * @param plaintextValue - The plaintext value to match
 * @param additionalQuery - Optional additional query filters (e.g., { status: 'active' })
 * @returns The first matching document or null
 */
async function findByEncryptedField(Model, fieldName, plaintextValue, additionalQuery = {}) {
    // Fetch all documents matching the additional query
    const documents = await Model.find(additionalQuery);
    // Search through documents, decrypting the field to find match
    for (const doc of documents) {
        const fieldValue = doc[fieldName];
        const decryptedValue = safeDecrypt(fieldValue);
        // Case-insensitive comparison for flexibility
        if (decryptedValue.toLowerCase() === plaintextValue.toLowerCase()) {
            return doc;
        }
    }
    return null;
}
/**
 * Find all documents where an encrypted field matches a plaintext value
 *
 * @param Model - Mongoose model to query
 * @param fieldName - The encrypted field to search
 * @param plaintextValue - The plaintext value to match
 * @param additionalQuery - Optional additional query filters
 * @returns Array of matching documents
 */
async function findAllByEncryptedField(Model, fieldName, plaintextValue, additionalQuery = {}) {
    // Fetch all documents matching the additional query
    const documents = await Model.find(additionalQuery);
    // Filter documents where decrypted field matches
    const matches = [];
    for (const doc of documents) {
        const fieldValue = doc[fieldName];
        const decryptedValue = safeDecrypt(fieldValue);
        if (decryptedValue.toLowerCase() === plaintextValue.toLowerCase()) {
            matches.push(doc);
        }
    }
    return matches;
}
//# sourceMappingURL=encryption-helpers.js.map