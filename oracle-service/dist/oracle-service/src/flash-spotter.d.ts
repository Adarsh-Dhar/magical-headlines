export declare class FlashMarketSpotter {
    private detector;
    private isRunning;
    private program;
    constructor();
    start(): Promise<void>;
    private scanForSpikes;
    private createFlashMarket;
    private resolveExpiredMarkets;
    private resolveMarket;
    private calculatePayouts;
}
//# sourceMappingURL=flash-spotter.d.ts.map