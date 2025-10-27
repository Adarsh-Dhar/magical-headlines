#!/usr/bin/env tsx

/**
 * Clear Mock Trend Scores
 * 
 * This script deletes all mock trend scores from the database.
 * Only real MagicBlock-calculated scores should remain.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function clearMockTrendScores() {
  try {
    console.log("🗑️  Clearing mock trend scores from database...\n");

    // Get tokens with trend scores
    const tokensWithScores = await prisma.token.findMany({
      where: {
        trendIndexScore: { gt: 0 }
      },
      select: {
        id: true,
        story: {
          select: {
            headline: true
          }
        },
        trendIndexScore: true,
        lastTrendUpdate: true
      }
    });

    console.log(`📊 Found ${tokensWithScores.length} tokens with trend scores\n`);

    if (tokensWithScores.length === 0) {
      console.log("✅ No trend scores to clear - database is already clean");
      return;
    }

    // Show what will be deleted
    console.log("Tokens with scores:");
    tokensWithScores.forEach((token, index) => {
      console.log(`${index + 1}. ${token.story.headline}`);
      console.log(`   Score: ${token.trendIndexScore}`);
      console.log(`   Last Update: ${token.lastTrendUpdate?.toISOString() || 'Never'}\n`);
    });

    // Delete trend history
    const historyCount = await prisma.trendIndexHistory.count();
    console.log(`🗑️  Deleting ${historyCount} trend history records...`);
    await prisma.trendIndexHistory.deleteMany({});
    console.log("✅ Trend history deleted\n");

    // Reset trend scores to 0
    console.log("🔄 Resetting trend scores to 0...");
    const updatedCount = await prisma.token.updateMany({
      where: {
        trendIndexScore: { gt: 0 }
      },
      data: {
        trendIndexScore: 0,
        trendVelocity: 0,
        sentimentScore: 0,
        mentionVelocity: 0,
        holderMomentum: 0,
        crossMarketCorr: 0,
        trendFactorWeights: null
      }
    });
    
    console.log(`✅ Reset ${updatedCount.count} tokens\n`);

    console.log("🎉 Mock trend scores cleared successfully!");
    console.log("\n💡 Next steps:");
    console.log("   1. Configure MagicBlock in .env file");
    console.log("   2. Start oracle service: npm run oracle");
    console.log("   3. Real scores will be calculated automatically");

  } catch (error) {
    console.error("❌ Error clearing mock trend scores:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearMockTrendScores();

