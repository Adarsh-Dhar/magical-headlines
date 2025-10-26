import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

// Initialize Prisma client
const prisma = new PrismaClient();

export interface TrendFactors {
  sentiment: number;           // -1 to 1 sentiment score
  tradingVelocity: number;     // trades per minute
  volumeSpike: number;         // deviation from average volume
  priceMomentum: number;       // rate of price change
  socialActivity: number;      // comments + likes per hour
  holderMomentum: number;      // new holders rate
  crossMarketCorr: number;      // correlation with other trending tokens
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
  score: number;               // 0-100 adaptive trend score
  factors: TrendFactors;
  weights: TrendWeights;
  confidence: number;          // 0-1 confidence level
  reasoning: string;           // AI explanation
  timestamp: Date;
}

export class AITrendCalculator {
  private genAI: any;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    });
  }

  /**
   * Calculate adaptive trend index for a specific token
   */
  async calculateTrendIndex(tokenId: string): Promise<TrendCalculationResult> {
    try {
      console.log(`🤖 Calculating AI trend index for token ${tokenId}...`);

      // Fetch multi-dimensional data
      const factors = await this.fetchTrendFactors(tokenId);
      
      // Generate AI prompt with market context
      const prompt = this.buildTrendPrompt(factors, tokenId);
      
      // Call AI model
      const aiResponse = await this.model.generateContent(prompt);
      const responseText = aiResponse.response.text();
      
      // Parse AI response
      const result = this.parseAIResponse(responseText, factors);
      
      console.log(`✅ Trend calculation complete: score=${result.score}, confidence=${result.confidence}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error calculating trend index for token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all trend factors for a token
   */
  private async fetchTrendFactors(tokenId: string): Promise<TrendFactors> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get token with related data
    const token = await prisma.token.findUnique({
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
          take: 1440 // 24 hours of minute data
        },
        holders: true
      }
    });

    if (!token) {
      throw new Error(`Token ${tokenId} not found`);
    }

    // Calculate sentiment score from headline and content
    const sentiment = await this.calculateSentiment(token.story.headline, token.story.content);
    
    // Calculate trading velocity (trades per minute in last hour)
    const tradingVelocity = token.trades.length / 60;
    
    // Calculate volume spike (current vs average)
    const recentVolume = token.volumeMinutes.slice(0, 60).reduce((sum, v) => sum + v.volumeSol, 0);
    const avgVolume = token.volumeMinutes.length > 0 
      ? token.volumeMinutes.reduce((sum, v) => sum + v.volumeSol, 0) / token.volumeMinutes.length
      : 0;
    const volumeSpike = avgVolume > 0 ? (recentVolume - avgVolume) / avgVolume : 0;
    
    // Calculate price momentum (rate of price change)
    const priceMomentum = token.priceChange24h / 100; // Convert percentage to decimal
    
    // Calculate social activity (comments + likes per hour)
    const socialActivity = (token.story.comments.length + token.story.likes.length) / 1; // per hour
    
    // Calculate holder momentum (new holders in last hour)
    const holderMomentum = token.holders.length > 0 ? token.holders.length / 10 : 0; // Simplified
    
    // Calculate cross-market correlation (simplified)
    const crossMarketCorr = await this.calculateCrossMarketCorrelation(tokenId);

    return {
      sentiment,
      tradingVelocity,
      volumeSpike,
      priceMomentum,
      socialActivity,
      holderMomentum,
      crossMarketCorr
    };
  }

  /**
   * Calculate sentiment score using AI
   */
  private async calculateSentiment(headline: string, content: string): Promise<number> {
    try {
      const prompt = `Analyze the sentiment of this news story and return a number between -1 (very negative) and 1 (very positive).

Headline: ${headline}
Content: ${content.substring(0, 500)}...

Return only a single number between -1 and 1, no other text.`;

      const response = await this.model.generateContent(prompt);
      const result = parseFloat(response.response.text().trim());
      
      // Clamp to valid range
      return Math.max(-1, Math.min(1, result || 0));
      
    } catch (error) {
      console.error("Error calculating sentiment:", error);
      return 0; // Neutral sentiment as fallback
    }
  }

  /**
   * Calculate cross-market correlation
   */
  private async calculateCrossMarketCorrelation(tokenId: string): Promise<number> {
    try {
      // Get other trending tokens
      const trendingTokens = await prisma.token.findMany({
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

      if (trendingTokens.length === 0) return 0;

      // Simple correlation based on volume patterns
      const currentToken = await prisma.token.findUnique({
        where: { id: tokenId },
        include: {
          volumeMinutes: {
            where: { minute: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
          }
        }
      });

      if (!currentToken) return 0;

      // Calculate correlation coefficient (simplified)
      let correlationSum = 0;
      for (const token of trendingTokens) {
        const correlation = this.calculateVolumeCorrelation(
          currentToken.volumeMinutes,
          token.volumeMinutes
        );
        correlationSum += correlation;
      }

      return correlationSum / trendingTokens.length;
      
    } catch (error) {
      console.error("Error calculating cross-market correlation:", error);
      return 0;
    }
  }

  /**
   * Calculate correlation between two volume time series
   */
  private calculateVolumeCorrelation(series1: any[], series2: any[]): number {
    if (series1.length === 0 || series2.length === 0) return 0;

    // Simple correlation calculation
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

  /**
   * Build AI prompt for trend calculation
   */
  private buildTrendPrompt(factors: TrendFactors, tokenId: string): string {
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

  /**
   * Get current market context for AI analysis
   */
  private getMarketContext() {
    // Simplified market context - in production, this would fetch real market data
    return {
      volatility: "medium",
      sentiment: "neutral",
      activeMarkets: 45
    };
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(responseText: string, factors: TrendFactors): TrendCalculationResult {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate weights sum to 1.0
      const weights = parsed.weights;
      const weightSum = Object.values(weights).reduce((sum: number, w: any) => sum + Number(w), 0) as number;
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
      
    } catch (error) {
      console.error("Error parsing AI response:", error);
      
      // Fallback to default weights
      const defaultWeights: TrendWeights = {
        sentiment: 0.25,
        tradingVelocity: 0.20,
        volumeSpike: 0.20,
        priceMomentum: 0.15,
        socialActivity: 0.10,
        holderMomentum: 0.05,
        crossMarketCorr: 0.05
      };

      // Calculate simple weighted score
      const score = Object.keys(defaultWeights).reduce((sum, key) => {
        return sum + (factors[key as keyof TrendFactors] * defaultWeights[key as keyof TrendWeights] * 100);
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

  /**
   * Generate hash of factors for verification
   */
  generateFactorsHash(factors: TrendFactors): string {
    const factorString = JSON.stringify(factors);
    return crypto.createHash('sha256').update(factorString).digest('hex');
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const aiTrendCalculator = new AITrendCalculator();
