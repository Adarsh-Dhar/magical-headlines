"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.aiTrendCalculator = exports.AITrendCalculator = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
const prisma = new client_1.PrismaClient();
class AITrendCalculator {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1000,
            }
        });
    }
    calculateTrendIndex(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🤖 Calculating AI trend index for token ${tokenId}...`);
                const factors = yield this.fetchTrendFactors(tokenId);
                const prompt = this.buildTrendPrompt(factors, tokenId);
                const aiResponse = yield this.model.generateContent(prompt);
                const responseText = aiResponse.response.text();
                const result = this.parseAIResponse(responseText, factors);
                console.log(`✅ Trend calculation complete: score=${result.score}, confidence=${result.confidence}`);
                return result;
            }
            catch (error) {
                console.error(`❌ Error calculating trend index for token ${tokenId}:`, error);
                throw error;
            }
        });
    }
    fetchTrendFactors(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const token = yield prisma.token.findUnique({
                where: { id: tokenId },
                include: {
                    story: {
                        include: {
                            comments: {
                                where: { createdAt: { gte: oneHourAgo } }
                            },
                            likes: {
                                where: { createdAt: { gte: oneHourAgo } }
                            }
                        }
                    },
                    trades: {
                        where: { timestamp: { gte: oneHourAgo } },
                        orderBy: { timestamp: 'desc' }
                    },
                    volumeMinutes: {
                        where: { minute: { gte: oneDayAgo } },
                        orderBy: { minute: 'desc' },
                        take: 1440
                    },
                    holders: true
                }
            });
            if (!token) {
                throw new Error(`Token ${tokenId} not found`);
            }
            const sentiment = yield this.calculateSentiment(token.story.headline, token.story.content);
            const tradingVelocity = token.trades.length / 60;
            const recentVolume = token.volumeMinutes.slice(0, 60).reduce((sum, v) => sum + v.volumeSol, 0);
            const avgVolume = token.volumeMinutes.length > 0
                ? token.volumeMinutes.reduce((sum, v) => sum + v.volumeSol, 0) / token.volumeMinutes.length
                : 0;
            const volumeSpike = avgVolume > 0 ? (recentVolume - avgVolume) / avgVolume : 0;
            const priceMomentum = token.priceChange24h / 100;
            const socialActivity = (token.story.comments.length + token.story.likes.length) / 1;
            const holderMomentum = token.holders.length > 0 ? token.holders.length / 10 : 0;
            const crossMarketCorr = yield this.calculateCrossMarketCorrelation(tokenId);
            return {
                sentiment,
                tradingVelocity,
                volumeSpike,
                priceMomentum,
                socialActivity,
                holderMomentum,
                crossMarketCorr
            };
        });
    }
    calculateSentiment(headline, content) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const prompt = `Analyze the sentiment of this news story and return a number between -1 (very negative) and 1 (very positive).

Headline: ${headline}
Content: ${content.substring(0, 500)}...

Return only a single number between -1 and 1, no other text.`;
                const response = yield this.model.generateContent(prompt);
                const result = parseFloat(response.response.text().trim());
                return Math.max(-1, Math.min(1, result || 0));
            }
            catch (error) {
                console.error("Error calculating sentiment:", error);
                return 0;
            }
        });
    }
    calculateCrossMarketCorrelation(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const trendingTokens = yield prisma.token.findMany({
                    where: {
                        id: { not: tokenId },
                        volume24h: { gt: 0 }
                    },
                    orderBy: { volume24h: 'desc' },
                    take: 10,
                    include: {
                        volumeMinutes: {
                            where: { minute: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
                        }
                    }
                });
                if (trendingTokens.length === 0)
                    return 0;
                const currentToken = yield prisma.token.findUnique({
                    where: { id: tokenId },
                    include: {
                        volumeMinutes: {
                            where: { minute: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
                        }
                    }
                });
                if (!currentToken)
                    return 0;
                let correlationSum = 0;
                for (const token of trendingTokens) {
                    const correlation = this.calculateVolumeCorrelation(currentToken.volumeMinutes, token.volumeMinutes);
                    correlationSum += correlation;
                }
                return correlationSum / trendingTokens.length;
            }
            catch (error) {
                console.error("Error calculating cross-market correlation:", error);
                return 0;
            }
        });
    }
    calculateVolumeCorrelation(series1, series2) {
        if (series1.length === 0 || series2.length === 0)
            return 0;
        const avg1 = series1.reduce((sum, v) => sum + v.volumeSol, 0) / series1.length;
        const avg2 = series2.reduce((sum, v) => sum + v.volumeSol, 0) / series2.length;
        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;
        const minLength = Math.min(series1.length, series2.length);
        for (let i = 0; i < minLength; i++) {
            const diff1 = series1[i].volumeSol - avg1;
            const diff2 = series2[i].volumeSol - avg2;
            numerator += diff1 * diff2;
            denom1 += diff1 * diff1;
            denom2 += diff2 * diff2;
        }
        const denominator = Math.sqrt(denom1 * denom2);
        return denominator === 0 ? 0 : numerator / denominator;
    }
    buildTrendPrompt(factors, tokenId) {
        const marketContext = this.getMarketContext();
        return `You are an AI financial analyst specializing in news token trend analysis. 

Current market context:
- Time: ${new Date().toISOString()}
- Market volatility: ${marketContext.volatility}
- Overall sentiment: ${marketContext.sentiment}
- Active markets: ${marketContext.activeMarkets}

For token ${tokenId}, analyze these factors and determine optimal weights for a trend index:

FACTORS:
- Sentiment: ${factors.sentiment.toFixed(3)} (range: -1 to 1)
- Trading Velocity: ${factors.tradingVelocity.toFixed(2)} trades/min
- Volume Spike: ${factors.volumeSpike.toFixed(3)} (deviation from average)
- Price Momentum: ${factors.priceMomentum.toFixed(3)} (rate of change)
- Social Activity: ${factors.socialActivity.toFixed(2)} interactions/hour
- Holder Momentum: ${factors.holderMomentum.toFixed(2)} new holders
- Cross-Market Correlation: ${factors.crossMarketCorr.toFixed(3)}

TASK:
1. Determine optimal weights for each factor (must sum to 1.0)
2. Calculate final trend score (0-100)
3. Assess confidence level (0-1)
4. Provide reasoning

RESPONSE FORMAT (JSON only):
{
  "weights": {
    "sentiment": 0.25,
    "tradingVelocity": 0.20,
    "volumeSpike": 0.20,
    "priceMomentum": 0.15,
    "socialActivity": 0.10,
    "holderMomentum": 0.05,
    "crossMarketCorr": 0.05
  },
  "score": 75.5,
  "confidence": 0.85,
  "reasoning": "High volume spike and positive sentiment drive trend, but low social activity limits confidence"
}`;
    }
    getMarketContext() {
        return {
            volatility: "medium",
            sentiment: "neutral",
            activeMarkets: 45
        };
    }
    parseAIResponse(responseText, factors) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in AI response");
            }
            const parsed = JSON.parse(jsonMatch[0]);
            const weights = parsed.weights;
            const weightSum = Object.values(weights).reduce((sum, w) => sum + Number(w), 0);
            if (Math.abs(Number(weightSum) - 1.0) > 0.01) {
                console.warn(`Weights sum to ${weightSum}, normalizing...`);
                Object.keys(weights).forEach(key => {
                    weights[key] = Number(weights[key]) / Number(weightSum);
                });
            }
            return {
                score: Math.max(0, Math.min(100, parsed.score || 0)),
                factors,
                weights,
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                reasoning: parsed.reasoning || "AI trend analysis completed",
                timestamp: new Date()
            };
        }
        catch (error) {
            console.error("Error parsing AI response:", error);
            const defaultWeights = {
                sentiment: 0.25,
                tradingVelocity: 0.20,
                volumeSpike: 0.20,
                priceMomentum: 0.15,
                socialActivity: 0.10,
                holderMomentum: 0.05,
                crossMarketCorr: 0.05
            };
            const score = Object.keys(defaultWeights).reduce((sum, key) => {
                return sum + (factors[key] * defaultWeights[key] * 100);
            }, 0);
            return {
                score: Math.max(0, Math.min(100, score)),
                factors,
                weights: defaultWeights,
                confidence: 0.5,
                reasoning: "Fallback calculation due to AI parsing error",
                timestamp: new Date()
            };
        }
    }
    generateFactorsHash(factors) {
        const factorString = JSON.stringify(factors);
        return crypto.createHash('sha256').update(factorString).digest('hex');
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.$disconnect();
        });
    }
}
exports.AITrendCalculator = AITrendCalculator;
exports.aiTrendCalculator = new AITrendCalculator();
//# sourceMappingURL=ai-trend-calculator.js.map