export interface TrendFactors {
    sentiment: number;
    tradingVelocity: number;
    volumeSpike: number;
    priceMomentum: number;
    socialActivity: number;
    holderMomentum: number;
    crossMarketCorr: number;
}
export interface TrendWeights {
    sentiment: number;
    tradingVelocity: number;
    volumeSpike: number;
    priceMomentum: number;
    socialActivity: number;
    holderMomentum: number;
    crossMarketCorr: number;
}
export interface TrendCalculationResult {
    score: number;
    factors: TrendFactors;
    weights: TrendWeights;
    confidence: number;
    reasoning: string;
    timestamp: Date;
}
export declare class AITrendCalculator {
    private genAI;
    private model;
    constructor();
    calculateTrendIndex(tokenId: string): Promise<TrendCalculationResult>;
    private fetchTrendFactors;
    private calculateSentiment;
    private calculateCrossMarketCorrelation;
    private calculateVolumeCorrelation;
    private buildTrendPrompt;
    private getMarketContext;
    private parseAIResponse;
    generateFactorsHash(factors: TrendFactors): string;
    cleanup(): Promise<void>;
}
export declare const aiTrendCalculator: AITrendCalculator;
//# sourceMappingURL=ai-trend-calculator.d.ts.map