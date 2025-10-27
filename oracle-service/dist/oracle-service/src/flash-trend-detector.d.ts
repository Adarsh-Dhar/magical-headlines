export declare class FlashTrendDetector {
    private velocityThreshold;
    private recentTriggers;
    private cooldownMs;
    detectVelocitySpike(tokenId: string): Promise<{
        detected: boolean;
        velocity: number;
    }>;
    createFlashMarket(tokenId: string, initialVelocity: number): Promise<any>;
}
//# sourceMappingURL=flash-trend-detector.d.ts.map