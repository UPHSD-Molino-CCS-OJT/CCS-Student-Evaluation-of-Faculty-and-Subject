/**
 * Encryption Helper Utilities
 *
 * Helper functions to simplify working with encrypted fields in the application.
 * Provides safe decryption with fallbacks for both encrypted and plaintext data.
 */
import { EncryptedData } from './encryption';
/**
 * Safely decrypt a field that may be encrypted or plaintext
 * Returns plaintext string in either case
 */
export declare function safeDecrypt(value: any): string;
/**
 * Safely encrypt a field that may already be encrypted
 * Returns encrypted data in either case
 */
export declare function safeEncrypt(value: any): EncryptedData | string;
/**
 * Decrypt all specified fields in a document
 * Returns a new object with decrypted fields
 */
export declare function decryptDocument<T extends Record<string, any>>(doc: T, fields: (keyof T)[]): T;
/**
 * Encrypt all specified fields in a document
 * Returns a new object with encrypted fields
 */
export declare function encryptDocument<T extends Record<string, any>>(doc: T, fields: (keyof T)[]): T;
/**
 * Decrypt multiple documents
 * Useful for processing query results
 */
export declare function decryptDocuments<T extends Record<string, any>>(docs: T[], fields: (keyof T)[]): T[];
/**
 * Check if a value is encrypted
 */
export declare function isEncrypted(value: any): value is EncryptedData;
/**
 * Decrypt admin fields for display
 */
export declare function decryptAdmin(admin: any): any;
/**
 * Decrypt course fields for display
 */
export declare function decryptCourse(course: any): any;
/**
 * Decrypt enrollment fields for display
 */
export declare function decryptEnrollment(enrollment: any): any;
/**
 * Decrypt evaluation fields for display
 */
export declare function decryptEvaluation(evaluation: any): any;
/**
 * Decrypt program fields for display
 */
export declare function decryptProgram(program: any): any;
/**
 * Decrypt student fields for display
 */
export declare function decryptStudent(student: any): any;
/**
 * Decrypt teacher fields for display
 */
export declare function decryptTeacher(teacher: any): any;
/**
 * Prepare document for API response (decrypt sensitive fields)
 * Returns a plain object (not Mongoose document) with decrypted fields
 */
export declare function prepareForResponse<T extends Record<string, any>>(doc: T, encryptedFields: (keyof T)[]): any;
/**
 * Batch prepare multiple documents for API response
 */
export declare function prepareArrayForResponse<T extends Record<string, any>>(docs: T[], encryptedFields: (keyof T)[]): any[];
//# sourceMappingURL=encryption-helpers.d.ts.map