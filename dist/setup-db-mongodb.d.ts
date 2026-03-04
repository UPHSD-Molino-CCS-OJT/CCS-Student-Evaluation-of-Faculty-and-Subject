/**
 * Auto-initialize the `faculty_evaluation` database with sample data if empty.
 * Used by server.ts on first request.
 * @returns {Promise<boolean>} - Success status
 */
export declare function initializeDatabase(): Promise<boolean>;
/**
 * Create sample data for the `faculty_evaluation` database.
 * Used by both auto-initialization and manual setup script.
 * @param {boolean} clearExistingData - Whether to clear existing data first (default: true)
 */
export declare function createSampleData(clearExistingData?: boolean): Promise<void>;
//# sourceMappingURL=setup-db-mongodb.d.ts.map