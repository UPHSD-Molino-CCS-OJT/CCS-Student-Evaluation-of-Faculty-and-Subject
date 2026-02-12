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
    totalBudget: number;
    timeWindowMinutes: number;
    maxQueries: number;
    queryEpsilon: number;
}
interface DPQuery {
    queryId: string;
    timestamp: Date;
    epsilon: number;
    result: any;
    queryType: string;
}
interface DPBudgetStatus {
    currentBudget: number;
    queriesUsed: number;
    windowStart: Date;
    windowEnd: Date;
    budgetExhausted: boolean;
    maxQueries: number;
    totalBudget: number;
}
interface DPQueryRequest {
    queryType: string;
    parameters: Record<string, any>;
    epsilon?: number;
}
interface DPQueryResult {
    success: boolean;
    cached: boolean;
    result?: any;
    budgetStatus?: DPBudgetStatus;
    error?: string;
}
declare class DPBudgetTracker {
    private static instance;
    private config;
    private queries;
    private currentWindowId;
    private windowStart;
    private static DEFAULT_CONFIG;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<DPBudgetConfig>): DPBudgetTracker;
    /**
     * Generate time window ID
     */
    private generateWindowId;
    /**
     * Get current time window end
     */
    private getWindowEnd;
    /**
     * Check if current window has expired and rotate if needed
     */
    private rotateWindowIfNeeded;
    /**
     * Generate unique query ID from parameters
     */
    private generateQueryId;
    /**
     * Get current budget status
     */
    getBudgetStatus(): DPBudgetStatus;
    /**
     * Check if a query exists in cache
     */
    private getCachedQuery;
    /**
     * Execute a DP query (or return cached result)
     *
     * @param request - Query request parameters
     * @param computeFunction - Function to compute result with noise if not cached
     * @returns Query result with budget status
     */
    executeQuery(request: DPQueryRequest, computeFunction: (epsilon: number) => any | Promise<any>): Promise<DPQueryResult>;
    /**
     * Get query history for current window (for audit purposes)
     */
    getQueryHistory(): DPQuery[];
    /**
     * Reset budget (emergency use only - breaks privacy guarantees!)
     */
    resetBudget(): void;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<DPBudgetConfig>): void;
}
export default DPBudgetTracker;
export { DPBudgetConfig, DPQuery, DPBudgetStatus, DPQueryRequest, DPQueryResult };
//# sourceMappingURL=dp-budget.d.ts.map