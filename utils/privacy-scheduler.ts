import cron from 'node-cron';
import Enrollment from '../models/Enrollment';
import mongoose from 'mongoose';

/**
 * Privacy-Preserving Scheduled Tasks
 * Handles automatic privacy protection operations
 */

interface DecouplingResult {
    success: boolean;
    decoupled?: number;
    message?: string;
    error?: string;
}

class PrivacyScheduler {
    
    /**
     * Initialize all privacy-related scheduled tasks
     */
    static initializeScheduledTasks(): void {
        console.log('🔒 Initializing privacy protection scheduled tasks...');
        
        // Clean up old session data (runs every 6 hours)
        this.scheduleSessionCleanup();
        
        console.log('✓ Privacy protection tasks scheduled');
        console.log('ℹ️  Note: Enrollment decoupling not needed - cryptographic receipt model ensures no reversible links exist');
    }

    /**
     * DEPRECATED: Enrollment decoupling no longer needed
     * Cryptographic receipt model ensures no reversible evaluation links exist
     * This function maintained for backward compatibility but does nothing
     */
    static scheduleEnrollmentDecoupling(): void {
        // No-op: Receipt model eliminates need for decoupling
        // No evaluation_id field means no links to decouple
        console.log('ℹ️  Enrollment decoupling deprecated - receipt model active');
    }

    /**
     * Schedule cleanup of old session data
     * Removes session data older than 7 days
     */
    static scheduleSessionCleanup(): void {
        // Run every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            try {
                console.log('🧹 Running session cleanup...');
                
                const sessionCollection = mongoose.connection.collection('sessions');
                
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                
                const result = await sessionCollection.deleteMany({
                    expires: { $lt: weekAgo }
                });
                
                if (result.deletedCount > 0) {
                    console.log(`✓ Cleaned up ${result.deletedCount} old session(s)`);
                }
                
            } catch (error) {
                console.error('❌ Error during session cleanup:', error);
            }
        });
    }

    /**
     * Manual trigger for enrollment decoupling (for admin use)
     */
    static async manualDecoupling(): Promise<DecouplingResult> {
        try {
            const gracePeriodHours = 24;
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - gracePeriodHours);
            
            const result = await Enrollment.updateMany(
                {
                    has_evaluated: true,
                    evaluation_id: { $ne: null },
                    updatedAt: { $lt: cutoffTime }
                },
                {
                    $unset: { evaluation_id: "" },
                    $set: { decoupled_at: new Date() }
                }
            );
            
            return {
                success: true,
                decoupled: result.modifiedCount,
                message: `Successfully decoupled ${result.modifiedCount} enrollment(s)`
            };
            
        } catch (error) {
            const err = error as Error;
            return {
                success: false,
                error: err.message
            };
        }
    }
}

export default PrivacyScheduler;
