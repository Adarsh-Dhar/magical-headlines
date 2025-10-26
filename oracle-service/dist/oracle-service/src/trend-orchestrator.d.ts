import { TrendCalculationResult } from "./ai-trend-calculator";
export interface OrchestratorConfig {
    updateIntervalMinutes: number;
    activeMarketThresholdHours: number;
    cacheTTLMinutes: number;
    batchSize: number;
}
export interface MarketUpdateStatus {
    tokenId: string;
    needsUpdate: boolean;
    lastUpdate: Date;
    priority: 'high' | 'medium' | 'low';
}
export declare class TrendOrchestrator {
    private config;
    private isRunning;
    private updateTimer?;
    private cache;
    constructor(config: OrchestratorConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startPeriodicUpdates;
    private updateActiveMarkets;
    private getActiveMarkets;
    updateMarketTrend(tokenId: string, forceUpdate?: boolean): Promise<TrendCalculationResult | null>;
    private updateDatabase;
    private calculateVelocity;
    private updateOnChain;
    private getCachedResult;
    private setCachedResult;
    private startEventListening;
    markMarketForUpdate(tokenId: string, priority?: 'high' | 'medium' | 'low'): void;
    getStatus(): {
        running: boolean;
        cacheSize: number;
        config: OrchestratorConfig;
    };
    getCircuitBreakerStatus(): {
        open: boolean;
        failures: number;
        threshold: number;
    };
    clearCache(): void;
}
export declare const trendOrchestrator: TrendOrchestrator;
//# sourceMappingURL=trend-orchestrator.d.ts.map