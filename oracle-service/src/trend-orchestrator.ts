import { PrismaClient } from "@prisma/client";
import { magicBlockAIOracle, MagicBlockAIResponse } from "./magicblock-ai-oracle";
import { TrendCalculationResult } from "./ai-trend-calculator";

// Initialize Prisma client
const prisma = new PrismaClient();

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

export class TrendOrchestrator {
  private config: OrchestratorConfig;
  private isRunning: boolean = false;
  private updateTimer?: NodeJS.Timeout;
  private cache: Map<string, { result: TrendCalculationResult; timestamp: Date }> = new Map();

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  /**
   * Start the orchestrator service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Trend orchestrator is already running");
      return;
    }

    console.log("🚀 Starting AI Trend Orchestrator...");
    this.isRunning = true;

    // Start periodic updates
    this.startPeriodicUpdates();

    // Listen for trade events
    this.startEventListening();

    console.log("✅ AI Trend Orchestrator started successfully");
  }

  /**
   * Stop the orchestrator service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("🛑 Stopping AI Trend Orchestrator...");
    this.isRunning = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    await prisma.$disconnect();
    console.log("✅ AI Trend Orchestrator stopped");
  }

  /**
   * Start periodic updates for active markets
   */
  private startPeriodicUpdates(): void {
    const intervalMs = this.config.updateIntervalMinutes * 60 * 1000;
    
    this.updateTimer = setInterval(async () => {
      try {
        await this.updateActiveMarkets();
      } catch (error) {
        console.error("❌ Error in periodic update:", error);
      }
    }, intervalMs);

    // Run initial update
    setTimeout(() => this.updateActiveMarkets(), 5000);
  }

  /**
   * Update active markets with new trend scores
   */
  private async updateActiveMarkets(): Promise<void> {
    console.log("🔄 Starting periodic update of active markets...");

    const activeMarkets = await this.getActiveMarkets();
    console.log(`📊 Found ${activeMarkets.length} active markets to update`);

    // Process in batches
    for (let i = 0; i < activeMarkets.length; i += this.config.batchSize) {
      const batch = activeMarkets.slice(i, i + this.config.batchSize);
      
      await Promise.all(batch.map(market => this.updateMarketTrend(market.tokenId)));
      
      // Small delay between batches to avoid overwhelming the system
      if (i + this.config.batchSize < activeMarkets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log("✅ Periodic update completed");
  }

  /**
   * Get markets that need trend updates
   */
  private async getActiveMarkets(): Promise<MarketUpdateStatus[]> {
    const thresholdTime = new Date(Date.now() - this.config.activeMarketThresholdHours * 60 * 60 * 1000);

    const tokens = await prisma.token.findMany({
      where: {
        OR: [
          // Markets with recent trades
          {
            trades: {
              some: {
                timestamp: { gte: thresholdTime }
              }
            }
          },
          // Markets with high volume
          {
            volume24h: { gt: 1.0 }
          },
          // Markets that haven't been updated recently
          {
            lastTrendUpdate: { lt: thresholdTime }
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

    return tokens.map(token => {
      const lastTrade = token.trades[0];
      const hoursSinceUpdate = (Date.now() - token.lastTrendUpdate.getTime()) / (1000 * 60 * 60);
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (token.volume24h > 10 || hoursSinceUpdate > 2) {
        priority = 'high';
      } else if (token.volume24h > 1 || hoursSinceUpdate > 1) {
        priority = 'medium';
      }

      return {
        tokenId: token.id,
        needsUpdate: hoursSinceUpdate > 0.5, // Update if older than 30 minutes
        lastUpdate: token.lastTrendUpdate,
        priority
      };
    });
  }

  /**
   * Update trend index for a specific market (on-demand)
   */
  async updateMarketTrend(tokenId: string, forceUpdate: boolean = false): Promise<TrendCalculationResult | null> {
    try {
      // Check cache first
      if (!forceUpdate) {
        const cached = this.getCachedResult(tokenId);
        if (cached) {
          console.log(`📋 Using cached trend result for token ${tokenId}`);
          return cached;
        }
      }

      console.log(`🤖 Calculating trend index for token ${tokenId}...`);

      // Call AI oracle
      const response: MagicBlockAIResponse = await magicBlockAIOracle.calculateTrendIndex(tokenId);
      
      if (!response.success || !response.result) {
        console.error(`❌ Failed to calculate trend for token ${tokenId}:`, response.error);
        return null;
      }

      const result = response.result;
      console.log(`✅ Trend calculation complete for token ${tokenId}: score=${result.score}, provider=${response.provider}`);

      // Update database
      await this.updateDatabase(tokenId, result);

      // Update cache
      this.setCachedResult(tokenId, result);

      // Update on-chain if needed
      await this.updateOnChain(tokenId, result);

      return result;

    } catch (error) {
      console.error(`❌ Error updating trend for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Update database with new trend data
   */
  private async updateDatabase(tokenId: string, result: TrendCalculationResult): Promise<void> {
    try {
      // Update token with new trend data
      await prisma.token.update({
        where: { id: tokenId },
        data: {
          trendIndexScore: result.score,
          trendVelocity: this.calculateVelocity(tokenId, result.score),
          sentimentScore: result.factors.sentiment,
          mentionVelocity: result.factors.socialActivity,
          holderMomentum: result.factors.holderMomentum,
          crossMarketCorr: result.factors.crossMarketCorr,
          lastTrendUpdate: result.timestamp,
          trendFactorWeights: result.weights as any
        }
      });

      // Create history record
      await prisma.trendIndexHistory.create({
        data: {
          tokenId,
          score: result.score,
          factors: result.factors as any,
          weights: result.weights as any,
          timestamp: result.timestamp
        }
      });

      console.log(`💾 Database updated for token ${tokenId}`);

    } catch (error) {
      console.error(`❌ Error updating database for token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate trend velocity (rate of score change)
   */
  private calculateVelocity(tokenId: string, newScore: number): number {
    const cached = this.cache.get(tokenId);
    if (!cached) return 0;

    const timeDiff = (Date.now() - cached.timestamp.getTime()) / (1000 * 60); // minutes
    if (timeDiff === 0) return 0;

    return (newScore - cached.result.score) / timeDiff;
  }

  /**
   * Update on-chain trend score
   */
  private async updateOnChain(tokenId: string, result: TrendCalculationResult): Promise<void> {
    try {
      // TODO: Implement on-chain update via oracle service
      console.log(`⛓️ On-chain update for token ${tokenId}: score=${result.score}`);
      
      // This would call the oracle service to update the blockchain
      // await updateTrendIndexOnChain(tokenId, result);
      
    } catch (error) {
      console.error(`❌ Error updating on-chain for token ${tokenId}:`, error);
      // Don't throw - on-chain update failure shouldn't stop the process
    }
  }

  /**
   * Get cached result if still valid
   */
  private getCachedResult(tokenId: string): TrendCalculationResult | null {
    const cached = this.cache.get(tokenId);
    if (!cached) return null;

    const ageMinutes = (Date.now() - cached.timestamp.getTime()) / (1000 * 60);
    if (ageMinutes > this.config.cacheTTLMinutes) {
      this.cache.delete(tokenId);
      return null;
    }

    return cached.result;
  }

  /**
   * Set cached result
   */
  private setCachedResult(tokenId: string, result: TrendCalculationResult): void {
    this.cache.set(tokenId, {
      result,
      timestamp: new Date()
    });
  }

  /**
   * Start listening for trade events
   */
  private startEventListening(): void {
    // TODO: Implement real-time event listening
    // This would listen to blockchain events and mark markets as needing updates
    console.log("👂 Event listening started (placeholder)");
  }

  /**
   * Mark market as needing update (called by event listeners)
   */
  markMarketForUpdate(tokenId: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    console.log(`🏷️ Marked token ${tokenId} for update (priority: ${priority})`);
    
    // Remove from cache to force fresh calculation
    this.cache.delete(tokenId);
    
    // TODO: Add to priority queue for immediate processing
  }

  /**
   * Get orchestrator status
   */
  getStatus(): { running: boolean; cacheSize: number; config: OrchestratorConfig } {
    return {
      running: this.isRunning,
      cacheSize: this.cache.size,
      config: this.config
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return magicBlockAIOracle.getCircuitBreakerStatus();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log("🗑️ Cache cleared");
  }
}

// Export singleton instance
export const trendOrchestrator = new TrendOrchestrator({
  updateIntervalMinutes: parseInt(process.env.TREND_UPDATE_INTERVAL_MINUTES || "5"),
  activeMarketThresholdHours: parseInt(process.env.TREND_ACTIVE_MARKET_THRESHOLD_HOURS || "1"),
  cacheTTLMinutes: 5,
  batchSize: 5
});
