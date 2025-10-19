import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMarketAccount } from "@/lib/blockchain-utils";

// GET /api/tokens/[id] - Get single token details with current market data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tokenId } = await params;
    
    // Fetch token from database
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: { 
        story: {
          select: {
            id: true,
            headline: true,
            author: true,
            createdAt: true,
            arweaveUrl: true,
            arweaveId: true
          }
        },
        trades: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 10,
          select: {
            id: true,
            type: true,
            amount: true,
            priceAtTrade: true,
            timestamp: true,
            trader: {
              select: {
                walletAddress: true,
                name: true
              }
            }
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

    // Fetch current blockchain data
    let marketData = null;
    if (token.marketAddress) {
      try {
        marketData = await fetchMarketAccount(token.marketAddress);
      } catch (error) {
        console.error('Error fetching market data:', error);
        // Continue without blockchain data
      }
    }

    // Calculate additional statistics
    const totalTrades = await prisma.trade.count({
      where: { tokenId }
    });

    const volume24h = await prisma.trade.aggregate({
      where: {
        tokenId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _sum: {
        amount: true
      }
    });

    // Calculate price change from first trade to current
    let priceChange24h = 0;
    if (token.trades.length > 0) {
      const firstTrade = token.trades[token.trades.length - 1]; // Oldest trade
      const currentPrice = marketData?.currentPrice || token.price;
      if (firstTrade.priceAtTrade > 0) {
        priceChange24h = ((currentPrice - firstTrade.priceAtTrade) / firstTrade.priceAtTrade) * 100;
      }
    }

    // Return combined data
    return NextResponse.json({
      id: token.id,
      marketAddress: token.marketAddress,
      mintAddress: token.mintAddress,
      price: marketData?.currentPrice || token.price,
      priceChange24h: marketData ? (marketData.currentPrice - token.price) / token.price * 100 : priceChange24h,
      volume24h: marketData?.totalVolume || token.volume24h || 0,
      marketCap: marketData ? marketData.currentPrice * 100 : token.marketCap, // Assuming 100 total supply
      currentSupply: marketData?.currentSupply || 100,
      solReserves: marketData?.solReserves || 0,
      totalTrades,
      isDelegated: marketData?.isDelegated || false,
      curveType: marketData?.curveType || 0,
      story: token.story,
      recentTrades: token.trades,
      lastUpdated: new Date().toISOString(),
      blockchainData: marketData ? {
        currentPrice: marketData.currentPrice,
        solReserves: marketData.solReserves,
        currentSupply: marketData.currentSupply,
        totalVolume: marketData.totalVolume,
        isDelegated: marketData.isDelegated
      } : null
    });

  } catch (error) {
    console.error("Error fetching token details:", error);
    return NextResponse.json(
      { error: "Failed to fetch token details" },
      { status: 500 }
    );
  }
}
