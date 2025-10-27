import { TrendCalculationResult } from "./ai-trend-calculator";
export interface MagicBlockConfig {
    rpcUrl: string;
    sessionKeypair: string;
}
export interface MagicBlockAIResponse {
    success: boolean;
    result?: TrendCalculationResult;
    error?: string;
    provider: 'magicblock';
}
export declare class MagicBlockAIOracle {
    private config;
    private circuitBreakerOpen;
    private circuitBreakerFailures;
    private circuitBreakerThreshold;
    private circuitBreakerTimeout;
    private connection?;
    private sessionKeypair?;
    private prisma;
    private magicBlockCalls;
    private magicBlockFailures;
    constructor(config: MagicBlockConfig);
    private initializeConnection;
    calculateTrendIndex(tokenId: string): Promise<MagicBlockAIResponse>;
    private callMagicBlockAI;
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
    };
}
export declare function getMagicBlockAIOracle(): MagicBlockAIOracle;
export declare const magicBlockAIOracle: {
    isAvailable: () => boolean;
    calculateTrendIndex: (tokenId: string) => Promise<MagicBlockAIResponse | {
        success: boolean;
        error: string;
        provider: string;
    }>;
    getCircuitBreakerStatus: () => {
        open: boolean;
        failures: number;
        threshold: number;
    };
    getProviderStats: () => {
        magicblock: {
            calls: number;
            failures: number;
        };
    };
};
//# sourceMappingURL=magicblock-ai-oracle.d.ts.map