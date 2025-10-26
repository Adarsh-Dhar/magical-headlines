#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

import { magicBlockAIOracle } from "./src/magicblock-ai-oracle";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAITrend() {
  try {
    console.log("🧪 Testing AI Trend Oracle...\n");

    // 1. Get any token from the database
    const token = await prisma.token.findFirst({
      include: {
        trades: { take: 5, orderBy: { timestamp: 'desc' } },
        story: true,
        holders: true,
        volumeMinutes: { take: 60, orderBy: { minute: 'desc' } }
      }
    });

    if (!token) {
      console.log("❌ No tokens found in database");
      return;
    }

    console.log(`📊 Testing with token: ${token.id}`);
    console.log(`   Story: ${token.story.headline}`);
    console.log(`   Volume 24h: ${token.volume24h}`);
    console.log(`   Trades: ${token.trades.length}`);
    console.log(`   Trend Score: ${token.trendIndexScore || 'none'}\n`);

    // 2. Call the AI Oracle
    console.log("🤖 Calling AI Oracle...");
    const response = await magicBlockAIOracle.calculateTrendIndex(token.id);

    if (response.success && response.result) {
      console.log("\n✅ AI Trend Calculation Result:");
      console.log(`   Score: ${response.result.score}`);
      console.log(`   Confidence: ${response.result.confidence}`);
      console.log(`   Provider: ${response.provider}`);
      console.log(`   Reasoning: ${response.result.reasoning}`);
      console.log("\n   Factor Weights:");
      Object.entries(response.result.weights).forEach(([key, value]) => {
        console.log(`     ${key}: ${(value as number).toFixed(3)}`);
      });
      console.log("\n   Factor Values:");
      Object.entries(response.result.factors).forEach(([key, value]) => {
        console.log(`     ${key}: ${(value as number).toFixed(3)}`);
      });
    } else {
      console.log("❌ AI Oracle failed:", response.error);
    }

    // 3. Update database
    if (response.success && response.result) {
      console.log("\n💾 Updating database...");
      await prisma.token.update({
        where: { id: token.id },
        data: {
          trendIndexScore: response.result.score,
          lastTrendUpdate: response.result.timestamp,
          sentimentScore: response.result.factors.sentiment,
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
      console.log("✅ Database updated!");
    }

    // 4. Verify it worked
    console.log("\n📊 Verifying database update...");
    const updated = await prisma.token.findUnique({
      where: { id: token.id },
      select: {
        id: true,
        trendIndexScore: true,
        lastTrendUpdate: true,
        sentimentScore: true
      }
    });
    console.log("Updated token:", updated);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAITrend();

