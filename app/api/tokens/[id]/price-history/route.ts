import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tokens/[id]/price-history - Get price history for a specific token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tokenId } = await params;
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "24h"; // 1h, 24h, 7d, 30d
    const limit = parseInt(searchParams.get("limit") || "100");

    // console.log(`📥 [API] Price history request - Token: ${tokenId}, Timeframe: ${timeframe}`);

    // Calculate time range based on timeframe
    const now = new Date();
    let startTime: Date;
    
    switch (timeframe) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get the token with its trades
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        story: {
          select: {
            id: true,
            headline: true,
          }
        },
        trades: {
          where: {
            timestamp: {
              gte: startTime,
            }
          },
          orderBy: {
            timestamp: "asc"
          },
          take: limit,
          select: {
            id: true,
            priceAtTrade: true,
            timestamp: true,
            type: true,
            amount: true,
          }
        }
      }
    });

    if (!token) {
      // console.log(`❌ [API] Token not found: ${tokenId}`);
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // console.log(`📊 [API] Query result - ${token.trades.length} trades found`);

    // If no trades, create a basic price history with current price
    if (token.trades.length === 0) {
      const priceHistory = [
        {
          timestamp: startTime.toISOString(),
          price: token.price,
          volume: 0,
          type: "initial"
        },
        {
          timestamp: now.toISOString(),
          price: token.price,
          volume: 0,
          type: "current"
        }
      ];

      return NextResponse.json({
        tokenId: token.id,
        storyId: token.story.id,
        storyHeadline: token.story.headline,
        currentPrice: token.price,
        priceChange24h: token.priceChange24h,
        volume24h: token.volume24h,
        marketCap: token.marketCap,
        timeframe,
        priceHistory,
        tradeCount: 0,
        volumeChange: 0,
        isVolumeUp: true,
        recentVolume: 0,
        earlierVolume: 0
      });
    }

    // Process trades to create price history
    const priceHistory = token.trades.map((trade, index) => ({
      timestamp: trade.timestamp.toISOString(),
      price: trade.priceAtTrade,
      volume: trade.amount,
      type: trade.type.toLowerCase(),
      tradeId: trade.id
    }));

    // Add current price as the last point if the last trade is not recent
    const lastTrade = token.trades[token.trades.length - 1];
    const timeSinceLastTrade = now.getTime() - lastTrade.timestamp.getTime();
    
    if (timeSinceLastTrade > 5 * 60 * 1000) { // 5 minutes
      priceHistory.push({
        timestamp: now.toISOString(),
        price: token.price,
        volume: 0,
        type: "current",
        tradeId: "current"
      });
    }

    // Calculate price change from first to last
    const firstPrice = priceHistory[0]?.price || token.price;
    const lastPrice = priceHistory[priceHistory.length - 1]?.price || token.price;
    const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    // Calculate volume change by comparing recent vs earlier periods
    const currentTime = new Date();
    let halfTime: Date;
    
    // Calculate half-time based on timeframe
    switch (timeframe) {
      case "1h":
        halfTime = new Date(currentTime.getTime() - 30 * 60 * 1000); // 30 minutes ago
        break;
      case "24h":
        halfTime = new Date(currentTime.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
        break;
      case "7d":
        halfTime = new Date(currentTime.getTime() - 3.5 * 24 * 60 * 60 * 1000); // 3.5 days ago
        break;
      case "30d":
        halfTime = new Date(currentTime.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
        break;
      default:
        halfTime = new Date(currentTime.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
    }

    const recentTrades = token.trades.filter(trade => 
      new Date(trade.timestamp) >= halfTime
    );
    const earlierTrades = token.trades.filter(trade => 
      new Date(trade.timestamp) < halfTime
    );

    const recentVolume = recentTrades.reduce((sum, trade) => sum + trade.amount, 0);
    const earlierVolume = earlierTrades.reduce((sum, trade) => sum + trade.amount, 0);

    // Debug logging
    // console.log(`[Volume Change Debug] Token ${tokenId}:`);
    // console.log(`  Total trades: ${token.trades.length}`);
    // console.log(`  Recent trades (after ${halfTime.toISOString()}): ${recentTrades.length}`);
    // console.log(`  Earlier trades (before ${halfTime.toISOString()}): ${earlierTrades.length}`);
    // console.log(`  Recent volume: ${recentVolume}`);
    // console.log(`  Earlier volume: ${earlierVolume}`);

    const volumeChange = earlierVolume > 0 
      ? ((recentVolume - earlierVolume) / earlierVolume) * 100 
      : 0;
    const isVolumeUp = volumeChange >= 0;

    // console.log(`  Volume change: ${volumeChange.toFixed(2)}%`);
    // console.log(`  Is volume up: ${isVolumeUp}`);

    // console.log(`✅ [API] Returning ${priceHistory.length} data points to client`);

    return NextResponse.json({
      tokenId: token.id,
      storyId: token.story.id,
      storyHeadline: token.story.headline,
      currentPrice: token.price,
      priceChange24h: token.priceChange24h,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      timeframe,
      priceHistory,
      tradeCount: token.trades.length,
      priceChange: priceChange,
      firstPrice,
      lastPrice,
      volumeChange: Math.abs(volumeChange),
      isVolumeUp,
      recentVolume,
      earlierVolume
    });

  } catch (error) {
    // console.error(`❌ [API] Error fetching price history for token ${tokenId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
