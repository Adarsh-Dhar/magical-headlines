import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const { tokenId } = params;
    
    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 }
      );
    }

    // Get token with trend data
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        story: {
          include: {
            tags: true
          }
        },
        trendHistory: {
          orderBy: { timestamp: 'desc' },
          take: 24 // Last 24 hours
        }
      }
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Calculate trend velocity
    const recentHistory = token.trendHistory.slice(0, 2);
    let velocity = 0;
    if (recentHistory.length === 2) {
      const timeDiff = (recentHistory[0].timestamp.getTime() - recentHistory[1].timestamp.getTime()) / (1000 * 60); // minutes
      if (timeDiff > 0) {
        velocity = (recentHistory[0].score - recentHistory[1].score) / timeDiff;
      }
    }

    // Get factor breakdown
    const currentFactors = token.trendFactorWeights as any || {};
    
    // Prepare response
    const response = {
      tokenId: token.id,
      headline: token.story.headline,
      currentScore: token.trendIndexScore,
      velocity: velocity,
      confidence: token.trendIndexScore > 0 ? 0.8 : 0, // Simplified confidence
      factors: {
        sentiment: token.sentimentScore,
        tradingVelocity: token.trendVelocity,
        volumeSpike: token.volume24h,
        priceMomentum: token.priceChange24h,
        socialActivity: token.mentionVelocity,
        holderMomentum: token.holderMomentum,
        crossMarketCorr: token.crossMarketCorr
      },
      weights: currentFactors,
      lastUpdate: token.lastTrendUpdate,
      history: token.trendHistory.map(h => ({
        score: h.score,
        timestamp: h.timestamp,
        factors: h.factors,
        weights: h.weights
      })),
      metadata: {
        tags: token.story.tags.map(tag => tag.name),
        createdAt: token.createdAt,
        marketCap: token.marketCap,
        price: token.price
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'max-age=60, s-maxage=60',
        'X-API-Version': '1.0.0'
      }
    });

  } catch (error) {
    console.error("Error fetching trend index:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const { tokenId } = params;
    
    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 }
      );
    }

    // Trigger real-time trend calculation
    // This would call the trend orchestrator to force an update
    console.log(`🔄 Triggering real-time trend calculation for token ${tokenId}`);
    
    // TODO: Integrate with trend orchestrator
    // await trendOrchestrator.updateMarketTrend(tokenId, true);
    
    return NextResponse.json({
      success: true,
      message: "Trend calculation triggered",
      tokenId
    });

  } catch (error) {
    console.error("Error triggering trend calculation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
