#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

import { magicBlockAIOracle } from "./src/magicblock-ai-oracle";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testTrendCalculation(): Promise<boolean> {
  try {
    console.log("🧪 Testing trend calculation...");

    // Step 1: Check if tokens exist
    const tokenCount = await prisma.token.count();
    if (tokenCount === 0) {
      console.log("❌ No tokens found");
      return false;
    }
    console.log(`✅ Found ${tokenCount} tokens`);

    // Step 2: Get a token with trading data
    const token = await prisma.token.findFirst({
      include: {
        trades: { take: 1, orderBy: { timestamp: 'desc' } },
        story: true,
        volumeMinutes: { take: 1 }
      }
    });

    if (!token) {
      console.log("❌ No valid tokens found");
      return false;
    }

    // Step 3: Check if token has required data
    const hasTrades = token.trades.length > 0;
    const hasVolumeMinutes = token.volumeMinutes.length > 0;

    console.log(`📊 Token: ${token.story.headline}`);
    console.log(`   Has trades: ${hasTrades}`);
    console.log(`   Has volume minutes: ${hasVolumeMinutes}`);

    if (!hasTrades && !hasVolumeMinutes) {
      console.log("⚠️  Token has no trading data - trend will still work but with minimal data");
    }

    // Step 4: Attempt to calculate trend
    console.log("\n🤖 Calling AI Oracle...");
    const response = await magicBlockAIOracle.calculateTrendIndex(token.id);

    if (!response.success) {
      console.log(`❌ Trend calculation failed: ${response.error}`);
      return false;
    }

    if (!response.result) {
      console.log("❌ No result returned");
      return false;
    }

    // Step 5: Validate the result
    const result = response.result;
    const isValidScore = result.score >= 0 && result.score <= 100;
    const hasValidConfidence = result.confidence >= 0 && result.confidence <= 1;
    const hasWeights = Object.keys(result.weights).length > 0;
    const hasFactors = Object.keys(result.factors).length > 0;

    console.log(`\n✅ Trend calculation successful!`);
    console.log(`   Score: ${result.score.toFixed(2)}`);
    console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`   Provider: ${response.provider}`);
    console.log(`   Valid score: ${isValidScore}`);
    console.log(`   Valid confidence: ${hasValidConfidence}`);
    console.log(`   Has weights: ${hasWeights}`);
    console.log(`   Has factors: ${hasFactors}`);

    // Final check
    const allChecksPass = isValidScore && hasValidConfidence && hasWeights && hasFactors;

    if (allChecksPass) {
      console.log("\n✅ ALL CHECKS PASSED - Trend calculation is working!");
      return true;
    } else {
      console.log("\n❌ SOME CHECKS FAILED - Trend calculation has issues");
      return false;
    }

  } catch (error) {
    console.error(`❌ Error during test:`, error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test and exit with appropriate code
testTrendCalculation()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

