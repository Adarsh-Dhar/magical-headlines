import { TrendCalculationResult } from "./ai-trend-calculator";
export interface MagicBlockConfig {
    rpcUrl: string;
    sessionKeypair: string;
    fallbackProvider: 'gemini' | 'openai';
}
export interface MagicBlockAIResponse {
    success: boolean;
    result?: TrendCalculationResult;
    error?: string;
    provider: 'magicblock' | 'fallback';
}
export declare class MagicBlockAIOracle {
    private config;
    private aiCalculator;
    private circuitBreakerOpen;
    private circuitBreakerFailures;
    private circuitBreakerThreshold;
    private circuitBreakerTimeout;
    private connection?;
    private sessionKeypair?;
    private prisma;
    constructor(config: MagicBlockConfig);
    private initializeConnection;
    calculateTrendIndex(tokenId: string): Promise<MagicBlockAIResponse>;
    private callMagicBlockAI;
    private useFallbackProvider;
    private openCircuitBreaker;
    private resetCircuitBreaker;
    getCircuitBreakerStatus(): {
        open: boolean;
        failures: number;
        threshold: number;
    };
    testConnection(): Promise<boolean>;
    getProviderStats(): {
        magicblock: {
            calls: number;
            failures: number;
        };
        fallback: {
            calls: number;
            failures: number;
        };
    };
}
export declare const magicBlockAIOracle: MagicBlockAIOracle;
//# sourceMappingURL=magicblock-ai-oracle.d.ts.map