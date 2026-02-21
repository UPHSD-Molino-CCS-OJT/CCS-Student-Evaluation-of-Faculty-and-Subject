"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptCommentsField = decryptCommentsField;
const encryption_1 = require("../utils/encryption");
/**
 * Helper: Decrypt comments field
 * Returns plaintext string from AES-256-GCM encrypted data
 */
function decryptCommentsField(comments) {
    if (!comments) {
        return '';
    }
    if (typeof comments === 'object' && comments.encrypted) {
        try {
            return (0, encryption_1.decryptField)(comments);
        }
        catch (error) {
            console.error('Failed to decrypt comments:', error);
            return '[Decryption failed - invalid key or corrupted data]';
        }
    }
    return '';
}
//# sourceMappingURL=helpers.js.map