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
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

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
        tradeCount: 0
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
      lastPrice
    });

  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
