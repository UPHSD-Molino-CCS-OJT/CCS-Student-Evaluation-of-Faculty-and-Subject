import crypto from 'crypto';

/**
 * Differential Privacy Budget Tracking System
 * 
 * Implements mathematically defensible DP with:
 * - Privacy budget (epsilon) accounting
 * - Query result caching per time window
 * - Cumulative epsilon tracking
 * - Query limiting to prevent noise averaging attacks
 * 
 * Threat Model Protection:
 * - Admin repeatedly queries same statistics to average out noise
 * - Statistical inference through multiple correlated queries
 * - Privacy budget exhaustion without tracking
 */

interface DPBudgetConfig {
    totalBudget: number;        // Total epsilon per time window (e.g., 1.0)
    timeWindowMinutes: number;  // Budget resets every X minutes (e.g., 60)
    maxQueries: number;         // Max queries per window (e.g., 10)
    queryEpsilon: number;       // Epsilon per query (e.g., 0.1)
}

interface DPQuery {
    queryId: string;            // SHA-256 hash of query parameters
    timestamp: Date;
    epsilon: number;            // Epsilon consumed by this query
    result: any;                // Cached noised result
    queryType: string;          // 'dashboard_stats', 'teacher_avg', etc.
}

interface DPBudgetStatus {
    currentBudget: number;      // Remaining epsilon in current window
    queriesUsed: number;        // Queries executed in current window
    windowStart: Date;
    windowEnd: Date;
    budgetExhausted: boolean;
    maxQueries: number;
    totalBudget: number;
}

interface DPQueryRequest {
    queryType: string;
    parameters: Record<string, any>;
    epsilon?: number;           // Optional custom epsilon
}

interface DPQueryResult {
    success: boolean;
    cached: boolean;
    result?: any;
    budgetStatus?: DPBudgetStatus;
    error?: string;
}

class DPBudgetTracker {
    private static instance: DPBudgetTracker;
    private config: DPBudgetConfig;
    private queries: Map<string, DPQuery[]>; // windowId -> queries
    private currentWindowId: string;
    private windowStart: Date;
    
    // Default configuration
    private static DEFAULT_CONFIG: DPBudgetConfig = {
        totalBudget: 1.0,       // Total epsilon per hour
        timeWindowMinutes: 60,  // 1-hour windows
        maxQueries: 10,         // Max 10 queries per hour
        queryEpsilon: 0.1       // 0.1 epsilon per query
    };

    private constructor(config?: Partial<DPBudgetConfig>) {
        this.config = { ...DPBudgetTracker.DEFAULT_CONFIG, ...config };
        this.queries = new Map();
        this.windowStart = new Date();
        this.currentWindowId = this.generateWindowId(this.windowStart);
    }

    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<DPBudgetConfig>): DPBudgetTracker {
        if (!DPBudgetTracker.instance) {
            DPBudgetTracker.instance = new DPBudgetTracker(config);
        }
        return DPBudgetTracker.instance;
    }

    /**
     * Generate time window ID
     */
    private generateWindowId(timestamp: Date): string {
        const windowMinutes = this.config.timeWindowMinutes;
        const windowStart = new Date(timestamp);
        windowStart.setMinutes(Math.floor(windowStart.getMinutes() / windowMinutes) * windowMinutes, 0, 0);
        return windowStart.toISOString();
    }

    /**
     * Get current time window end
     */
    private getWindowEnd(windowStart: Date): Date {
        const end = new Date(windowStart);
        end.setMinutes(end.getMinutes() + this.config.timeWindowMinutes);
        return end;
    }

    /**
     * Check if current window has expired and rotate if needed
     */
    private rotateWindowIfNeeded(): void {
        const now = new Date();
        const newWindowId = this.generateWindowId(now);
        
        if (newWindowId !== this.currentWindowId) {
            // Window has rotated
            this.currentWindowId = newWindowId;
            this.windowStart = new Date(newWindowId);
            
            // Clean up old windows (keep last 3 for audit trail)
            const allWindowIds = Array.from(this.queries.keys()).sort();
            if (allWindowIds.length > 3) {
                const toDelete = allWindowIds.slice(0, allWindowIds.length - 3);
                toDelete.forEach(id => this.queries.delete(id));
            }
        }
    }

    /**
     * Generate unique query ID from parameters
     */
    private generateQueryId(queryType: string, parameters: Record<string, any>): string {
        const queryString = JSON.stringify({ queryType, parameters }, Object.keys({ queryType, ...parameters }).sort());
        return crypto.createHash('sha256').update(queryString).digest('hex');
    }

    /**
     * Get current budget status
     */
    getBudgetStatus(): DPBudgetStatus {
        this.rotateWindowIfNeeded();
        
        const windowQueries = this.queries.get(this.currentWindowId) || [];
        const consumedBudget = windowQueries.reduce((sum, q) => sum + q.epsilon, 0);
        const currentBudget = this.config.totalBudget - consumedBudget;
        
        return {
            currentBudget: Math.max(0, currentBudget),
            queriesUsed: windowQueries.length,
            windowStart: this.windowStart,
            windowEnd: this.getWindowEnd(this.windowStart),
            budgetExhausted: currentBudget <= 0 || windowQueries.length >= this.config.maxQueries,
            maxQueries: this.config.maxQueries,
            totalBudget: this.config.totalBudget
        };
    }

    /**
     * Check if a query exists in cache
     */
    private getCachedQuery(queryId: string): DPQuery | null {
        this.rotateWindowIfNeeded();
        const windowQueries = this.queries.get(this.currentWindowId) || [];
        return windowQueries.find(q => q.queryId === queryId) || null;
    }

    /**
     * Execute a DP query (or return cached result)
     * 
     * @param request - Query request parameters
     * @param computeFunction - Function to compute result with noise if not cached
     * @returns Query result with budget status
     */
    async executeQuery(
        request: DPQueryRequest, 
        computeFunction: (epsilon: number) => any | Promise<any>
    ): Promise<DPQueryResult> {
        try {
            this.rotateWindowIfNeeded();
            
            const queryId = this.generateQueryId(request.queryType, request.parameters);
            const epsilon = request.epsilon || this.config.queryEpsilon;
            
            // Check cache first
            const cached = this.getCachedQuery(queryId);
            if (cached) {
                return {
                    success: true,
                    cached: true,
                    result: cached.result,
                    budgetStatus: this.getBudgetStatus()
                };
            }
            
            // Check budget availability
            const status = this.getBudgetStatus();
            if (status.budgetExhausted) {
                return {
                    success: false,
                    cached: false,
                    error: `Privacy budget exhausted. ${status.queriesUsed}/${status.maxQueries} queries used. Budget resets at ${status.windowEnd.toISOString()}`,
                    budgetStatus: status
                };
            }
            
            if (status.currentBudget < epsilon) {
                return {
                    success: false,
                    cached: false,
                    error: `Insufficient privacy budget. Remaining: ${status.currentBudget.toFixed(2)}ε, Required: ${epsilon}ε`,
                    budgetStatus: status
                };
            }
            
            // Execute query with noise
            const result = await computeFunction(epsilon);
            
            // Cache result
            const query: DPQuery = {
                queryId,
                timestamp: new Date(),
                epsilon,
                result,
                queryType: request.queryType
            };
            
            if (!this.queries.has(this.currentWindowId)) {
                this.queries.set(this.currentWindowId, []);
            }
            this.queries.get(this.currentWindowId)!.push(query);
            
            return {
                success: true,
                cached: false,
                result,
                budgetStatus: this.getBudgetStatus()
            };
            
        } catch (error) {
            return {
                success: false,
                cached: false,
                error: `Query execution failed: ${(error as Error).message}`
            };
        }
    }

    /**
     * Get query history for current window (for audit purposes)
     */
    getQueryHistory(): DPQuery[] {
        this.rotateWindowIfNeeded();
        return this.queries.get(this.currentWindowId) || [];
    }

    /**
     * Reset budget (emergency use only - breaks privacy guarantees!)
     */
    resetBudget(): void {
        console.warn('⚠️ WARNING: Privacy budget manually reset. This breaks differential privacy guarantees!');
        this.queries.clear();
        this.windowStart = new Date();
        this.currentWindowId = this.generateWindowId(this.windowStart);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<DPBudgetConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}

export default DPBudgetTracker;
export { DPBudgetConfig, DPQuery, DPBudgetStatus, DPQueryRequest, DPQueryResult };
