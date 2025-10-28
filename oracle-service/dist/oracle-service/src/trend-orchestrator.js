"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trendOrchestrator = exports.TrendOrchestrator = void 0;
const client_1 = require("@prisma/client");
const ai_trend_calculator_1 = require("./ai-trend-calculator");
const prisma = new client_1.PrismaClient();
class TrendOrchestrator {
    constructor(config) {
        this.isRunning = false;
        this.cache = new Map();
        this.config = config;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log("⚠️ Trend orchestrator is already running");
                return;
            }
            console.log("🚀 Starting AI Trend Orchestrator...");
            this.isRunning = true;
            this.startPeriodicUpdates();
            this.startEventListening();
            console.log("✅ AI Trend Orchestrator started successfully");
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning) {
                return;
            }
            console.log("🛑 Stopping AI Trend Orchestrator...");
            this.isRunning = false;
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
            }
            yield prisma.$disconnect();
            console.log("✅ AI Trend Orchestrator stopped");
        });
    }
    startPeriodicUpdates() {
        const intervalMs = this.config.updateIntervalMinutes * 60 * 1000;
        this.updateTimer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.updateActiveMarkets();
                console.log("✅ Periodic update completed");
            }
            catch (error) {
                console.error("❌ Error in periodic update:", error);
            }
        }), intervalMs);
        setTimeout(() => this.updateActiveMarkets(), 5000);
    }
    updateActiveMarkets() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🔄 Starting periodic update of active markets...");
            const activeMarkets = yield this.getActiveMarkets();
            console.log(`📊 Found ${activeMarkets.length} active markets to update`);
            let successCount = 0;
            let failureCount = 0;
            for (let i = 0; i < activeMarkets.length; i += this.config.batchSize) {
                const batch = activeMarkets.slice(i, i + this.config.batchSize);
                yield Promise.all(batch.map((market) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield this.updateMarketTrend(market.tokenId);
                        successCount++;
                    }
                    catch (error) {
                        failureCount++;
                        console.error(`❌ Failed to update trend for token ${market.tokenId}:`, error);
                    }
                })));
                if (i + this.config.batchSize < activeMarkets.length) {
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            console.log(`✅ Periodic update completed: ${successCount} succeeded, ${failureCount} failed`);
        });
    }
    getActiveMarkets() {
        return __awaiter(this, void 0, void 0, function* () {
            const thresholdTime = new Date(Date.now() - this.config.activeMarketThresholdHours * 60 * 60 * 1000);
            console.log(`🔍 Querying active markets with threshold: ${thresholdTime.toISOString()}`);
            console.log(`   Threshold hours: ${this.config.activeMarketThresholdHours}`);
            const totalTokens = yield prisma.token.count();
            console.log(`📊 Total tokens in database: ${totalTokens}`);
            const tokens = yield prisma.token.findMany({
                where: {
                    OR: [
                        {
                            trades: {
                                some: {
                                    timestamp: { gte: thresholdTime }
                                }
                            }
                        },
                        {
                            volume24h: { gt: 0 }
                        },
                        {
                            lastTrendUpdate: { lt: thresholdTime }
                        },
                        {
                            lastTrendUpdate: null
                        }
                    ]
                },
                include: {
                    trades: {
                        where: { timestamp: { gte: thresholdTime } },
                        orderBy: { timestamp: 'desc' },
                        take: 1
                    }
                },
                orderBy: { volume24h: 'desc' }
            });
            console.log(`📊 Found ${tokens.length} tokens matching active market criteria`);
            if (tokens.length === 0) {
                console.log(`⚠️ No tokens matched criteria. Checking all tokens...`);
                const allTokens = yield prisma.token.findMany({
                    select: {
                        id: true,
                        volume24h: true,
                        lastTrendUpdate: true,
                        trendIndexScore: true
                    },
                    take: 5
                });
                allTokens.forEach(token => {
                    console.log(`   Token ${token.id}: volume=${token.volume24h}, lastUpdate=${token.lastTrendUpdate}, score=${token.trendIndexScore}`);
                });
            }
            else {
                tokens.forEach(token => {
                    console.log(`   Token ${token.id}: volume=${token.volume24h}, trades=${token.trades.length}, lastUpdate=${token.lastTrendUpdate}`);
                });
            }
            return tokens.map(token => {
                const lastTrade = token.trades[0];
                const hoursSinceUpdate = token.lastTrendUpdate
                    ? (Date.now() - token.lastTrendUpdate.getTime()) / (1000 * 60 * 60)
                    : Infinity;
                let priority = 'low';
                if (token.volume24h > 10 || hoursSinceUpdate > 2) {
                    priority = 'high';
                }
                else if (token.volume24h > 1 || hoursSinceUpdate > 1) {
                    priority = 'medium';
                }
                if (!token.lastTrendUpdate) {
                    priority = 'high';
                }
                return {
                    tokenId: token.id,
                    needsUpdate: hoursSinceUpdate > 0.5 || token.lastTrendUpdate === null,
                    lastUpdate: token.lastTrendUpdate,
                    priority
                };
            });
        });
    }
    updateMarketTrend(tokenId_1) {
        return __awaiter(this, arguments, void 0, function* (tokenId, forceUpdate = false) {
            console.log(`\n========== TREND UPDATE START ==========`);
            console.log(`Token ID: ${tokenId}`);
            console.log(`Force update: ${forceUpdate}`);
            try {
                if (!forceUpdate) {
                    const cached = this.getCachedResult(tokenId);
                    if (cached) {
                        console.log(`✅ Using cached trend result for token ${tokenId}`);
                        return cached;
                    }
                }
                console.log(`🔄 Calculating fresh trend index for token ${tokenId}...`);
                console.log(`📞 Calling Gemini AI for trend calculation...`);
                const result = yield ai_trend_calculator_1.aiTrendCalculator.calculateTrendIndex(tokenId);
                console.log(`✅ Gemini AI trend calculation complete for token ${tokenId}: score=${result.score}`);
                console.log(`   Confidence: ${result.confidence}`);
                console.log(`   Timestamp: ${result.timestamp}`);
                console.log(`💾 Updating database...`);
                yield this.updateDatabase(tokenId, result);
                console.log(`🗄️ Updating cache...`);
                this.setCachedResult(tokenId, result);
                console.log(`⛓️ Updating on-chain...`);
                yield this.updateOnChain(tokenId, result);
                console.log(`========== TREND UPDATE SUCCESS ==========\n`);
                return result;
            }
            catch (error) {
                console.error(`\n========== TREND UPDATE FAILED ==========`);
                console.error(`Token ID: ${tokenId}`);
                console.error(`Error: ${error}`);
                console.error(`Error stack:`, error.stack);
                console.error(`==========================================\n`);
                throw error;
            }
        });
    }
    updateDatabase(tokenId, result) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.token.update({
                    where: { id: tokenId },
                    data: {
                        trendIndexScore: result.score,
                        trendVelocity: this.calculateVelocity(tokenId, result.score),
                        sentimentScore: result.factors.sentiment,
                        mentionVelocity: result.factors.socialActivity,
                        holderMomentum: result.factors.holderMomentum,
                        crossMarketCorr: result.factors.crossMarketCorr,
                        lastTrendUpdate: result.timestamp,
                        trendFactorWeights: result.weights
                    }
                });
                yield prisma.trendIndexHistory.create({
                    data: {
                        tokenId,
                        score: result.score,
                        factors: result.factors,
                        weights: result.weights,
                        timestamp: result.timestamp
                    }
                });
                console.log(`💾 Database updated for token ${tokenId}`);
            }
            catch (error) {
                console.error(`❌ Error updating database for token ${tokenId}:`, error);
                throw error;
            }
        });
    }
    calculateVelocity(tokenId, newScore) {
        const cached = this.cache.get(tokenId);
        if (!cached)
            return 0;
        const timeDiff = (Date.now() - cached.timestamp.getTime()) / (1000 * 60);
        if (timeDiff === 0)
            return 0;
        return (newScore - cached.result.score) / timeDiff;
    }
    updateOnChain(tokenId, result) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`⛓️ On-chain update for token ${tokenId}: score=${result.score}`);
            }
            catch (error) {
                console.error(`❌ Error updating on-chain for token ${tokenId}:`, error);
            }
        });
    }
    getCachedResult(tokenId) {
        const cached = this.cache.get(tokenId);
        if (!cached)
            return null;
        const ageMinutes = (Date.now() - cached.timestamp.getTime()) / (1000 * 60);
        if (ageMinutes > this.config.cacheTTLMinutes) {
            this.cache.delete(tokenId);
            return null;
        }
        return cached.result;
    }
    setCachedResult(tokenId, result) {
        this.cache.set(tokenId, {
            result,
            timestamp: new Date()
        });
    }
    startEventListening() {
        console.log("👂 Event listening started (placeholder)");
    }
    markMarketForUpdate(tokenId, priority = 'medium') {
        console.log(`🏷️ Marked token ${tokenId} for update (priority: ${priority})`);
        this.cache.delete(tokenId);
    }
    getStatus() {
        return {
            running: this.isRunning,
            cacheSize: this.cache.size,
            config: this.config
        };
    }
    getCircuitBreakerStatus() {
        return { open: false, failures: 0, threshold: 0 };
    }
    clearCache() {
        this.cache.clear();
        console.log("🗑️ Cache cleared");
    }
}
exports.TrendOrchestrator = TrendOrchestrator;
exports.trendOrchestrator = new TrendOrchestrator({
    updateIntervalMinutes: parseInt(process.env.TREND_UPDATE_INTERVAL_MINUTES || "5"),
    activeMarketThresholdHours: parseInt(process.env.TREND_ACTIVE_MARKET_THRESHOLD_HOURS || "1"),
    cacheTTLMinutes: 5,
    batchSize: 5
});
//# sourceMappingURL=trend-orchestrator.js.map