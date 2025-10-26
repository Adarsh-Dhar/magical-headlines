#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

import { magicBlockAIOracle } from "./src/magicblock-ai-oracle";
import { aiTrendCalculator } from "./src/ai-trend-calculator";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAITrendVerbose() {
  try {
    console.log("🔬 Detailed AI Trend Oracle Test\n");

    // 1. Get tokens from the database
    const tokens = await prisma.token.findMany({
      include: {
        trades: { take: 10, orderBy: { timestamp: 'desc' } },
        story: true,
        holders: true,
        volumeMinutes: { take: 60, orderBy: { minute: 'desc' } }
      },
      take: 3
    });

    console.log(`📊 Found ${tokens.length} tokens in database\n`);
    
    if (tokens.length === 0) {
      console.log("❌ No tokens found in database");
      return;
    }

    // Test each token
    for (const token of tokens) {
      console.log("=" .repeat(60));
      console.log(`\n📰 Token: ${token.id}`);
      console.log(`   Headline: ${token.story.headline}`);
      console.log(`   Volume 24h: ${token.volume24h}`);
      console.log(`   Trades: ${token.trades.length}`);
      console.log(`   Volume Minutes: ${token.volumeMinutes.length}`);
      console.log(`   Current Trend Score: ${token.trendIndexScore || 'none'}`);
      console.log(`   Last Update: ${token.lastTrendUpdate || 'never'}\n`);

      // Test MagicBlock AI Oracle
      console.log("🤖 Testing MagicBlock AI Oracle...");
      const response = await magicBlockAIOracle.calculateTrendIndex(token.id);

      if (response.success && response.result) {
        console.log("\n✅ Result from MagicBlock:");
        console.log(`   Score: ${response.result.score.toFixed(2)}`);
        console.log(`   Confidence: ${(response.result.confidence * 100).toFixed(1)}%`);
        console.log(`   Provider: ${response.provider}`);
        console.log(`   Reasoning: ${response.result.reasoning}`);
        
        console.log("\n   🎯 Adaptive Weights (AI-Determined):");
        const weights = response.result.weights;
        const sorted = Object.entries(weights)
          .sort((a, b) => (b[1] as number) - (a[1] as number));
        
        sorted.forEach(([key, value]) => {
          const bar = '█'.repeat(Math.round((value as number) * 30));
          console.log(`     ${key.padEnd(20)} ${bar} ${((value as number) * 100).toFixed(1)}%`);
        });

        console.log("\n   📈 Factor Values:");
        const factors = response.result.factors;
        Object.entries(factors).forEach(([key, value]) => {
          console.log(`     ${key.padEnd(20)} ${(value as number).toFixed(3)}`);
        });

        // Verify adaptive behavior
        console.log("\n   🧠 Adaptive Behavior Analysis:");
        const highWeight = sorted[0];
        const lowWeight = sorted[sorted.length - 1];
        console.log(`     Highest weight: ${highWeight[0]} (${((highWeight[1] as number) * 100).toFixed(1)}%)`);
        console.log(`     Lowest weight: ${lowWeight[0]} (${((lowWeight[1] as number) * 100).toFixed(1)}%)`);
        console.log(`     👉 AI is emphasizing ${highWeight[0]} over ${lowWeight[0]}`);
        
        // Update database
        await prisma.token.update({
          where: { id: token.id },
          data: {
            trendIndexScore: response.result.score,
            lastTrendUpdate: response.result.timestamp,
            sentimentScore: response.result.factors.sentiment,
            trendVelocity: 0,
            mentionVelocity: response.result.factors.socialActivity,
            holderMomentum: response.result.factors.holderMomentum,
            crossMarketCorr: response.result.factors.crossMarketCorr,
            trendFactorWeights: response.result.weights as any
          }
        });

        await prisma.trendIndexHistory.create({
          data: {
            tokenId: token.id,
            score: response.result.score,
            factors: response.result.factors as any,
            weights: response.result.weights as any,
            timestamp: response.result.timestamp
          }
        });

        console.log("\n   💾 Database updated successfully!");
        
      } else {
        console.log("   ❌ Failed:", response.error);
      }

      console.log();
    }

    // Show circuit breaker status
    console.log("=" .repeat(60));
    const stats = magicBlockAIOracle.getCircuitBreakerStatus();
    console.log("\n🔌 Circuit Breaker Status:");
    console.log(`   State: ${stats.state}`);
    console.log(`   Failures: ${stats.failureCount}`);
    console.log(`   Last failure: ${stats.lastFailureTime || 'never'}`);
    console.log(`   Throttled: ${stats.isThrottled ? 'yes' : 'no'}`);

  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAITrendVerbose();

