"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Privacy-Preserving Scheduled Tasks
 * Handles automatic privacy protection operations
 */
class PrivacyScheduler {
    /**
     * Initialize all privacy-related scheduled tasks
     */
    static initializeScheduledTasks() {
        console.log('🔒 Initializing privacy protection scheduled tasks...');
        // Clean up old session data (runs every 6 hours)
        this.scheduleSessionCleanup();
        console.log('✓ Privacy protection tasks scheduled');
    }
    /**
     * Schedule cleanup of old session data
     * Removes session data older than 7 days
     */
    static scheduleSessionCleanup() {
        // Run every 6 hours
        node_cron_1.default.schedule('0 */6 * * *', async () => {
            try {
                console.log('🧹 Running session cleanup...');
                const sessionCollection = mongoose_1.default.connection.collection('sessions');
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const result = await sessionCollection.deleteMany({
                    expires: { $lt: weekAgo }
                });
                if (result.deletedCount > 0) {
                    console.log(`✓ Cleaned up ${result.deletedCount} old session(s)`);
                }
            }
            catch (error) {
                console.error('❌ Error during session cleanup:', error);
            }
        });
    }
}
exports.default = PrivacyScheduler;
//# sourceMappingURL=privacy-scheduler.js.map