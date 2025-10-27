#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function recalculateVolumes() {
  try {
    console.log("🔄 Recalculating volume24h for all tokens...\n");

    const tokens = await prisma.token.findMany({
      include: {
        trades: true,
        story: true
      }
    });

    console.log(`📊 Processing ${tokens.length} tokens\n`);

    let updatedCount = 0;

    for (const token of tokens) {
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const recentTrades = await prisma.trade.findMany({
          where: {
            tokenId: token.id,
            timestamp: { gte: oneDayAgo }
          },
          orderBy: { timestamp: 'desc' }
        });

        if (recentTrades.length === 0) {
          console.log(`⏭️  ${token.story.headline}: No recent trades`);
          continue;
        }

        // Calculate volume
        const volume24h = recentTrades.reduce((sum, t) => sum + (t.amount * t.priceAtTrade), 0);
        
        // Calculate price change
        const currentPrice = recentTrades[0].priceAtTrade;
        const oldestPrice = recentTrades[recentTrades.length - 1].priceAtTrade;
        const priceChange24h = oldestPrice > 0 ? ((currentPrice - oldestPrice) / oldestPrice) * 100 : 0;

        // Update token
        await prisma.token.update({
          where: { id: token.id },
          data: {
            price: currentPrice,
            priceChange24h,
            volume24h,
          }
        });

        console.log(`✅ Updated: ${token.story.headline}`);
        console.log(`   Volume: ${volume24h.toFixed(4)} SOL`);
        console.log(`   Trades: ${recentTrades.length}`);
        console.log(`   Price: ${currentPrice}\n`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating ${token.id}:`, error);
      }
    }

    console.log(`\n✅ Done! Updated ${updatedCount} tokens`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateVolumes();

