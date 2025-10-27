import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeFactors = searchParams.get('includeFactors') === 'true';

    // DIAGNOSTIC: Get all tokens to understand why some aren't trending
    const allTokens = await prisma.token.findMany({
      include: {
        story: true,
        trades: true
      }
    });

    // Calculate diagnostic stats
    const totalTokens = allTokens.length;
    const tokensWithTrend = allTokens.filter(t => t.trendIndexScore && t.trendIndexScore > 0).length;
    const tokensWithVolume = allTokens.filter(t => t.volume24h && t.volume24h > 0).length;
    const tokensNeverUpdated = allTokens.filter(t => !t.lastTrendUpdate).length;

    // Fetch tokens ordered by AI trend index score
    const tokens = await prisma.token.findMany({
      where: {
        trendIndexScore: { gt: 0 }, // Only tokens with calculated trend scores
        volume24h: { gt: 0 } // Only tokens with trading activity
      },
      include: {
        story: {
          include: { 
            tags: true 
          }
        },
        trades: {
          select: { 
            traderId: true 
          },
          distinct: ['traderId']
        },
        trendHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      orderBy: { 
        trendIndexScore: 'desc' // Order by AI trend index instead of volume
      },
      take: limit
    });

    // Transform to trending markets format
    const trendingMarkets = tokens.map((token, index) => {
      const recentTrend = token.trendHistory[0];
      const velocity = recentTrend ? 
        (token.trendIndexScore - (recentTrend.score || 0)) / 
        ((Date.now() - recentTrend.timestamp.getTime()) / (1000 * 60)) : 0;

      const market = {
        rank: index + 1,
        market_id: token.id,
        headline: token.story.headline,
        trend_score: token.trendIndexScore,
        trend_velocity: velocity,
        confidence: token.trendIndexScore > 0 ? 0.8 : 0, // Simplified confidence
        volume_24h: token.volume24h,
        current_price: token.price,
        price_change_24h: token.priceChange24h,
        market_cap: token.marketCap,
        tags: token.story.tags.map(tag => ({
          id: tag.id,
          name: tag.name
        })),
        traders_count: token.trades.length,
        created_at: token.createdAt.toISOString(),
        last_trend_update: token.lastTrendUpdate.toISOString()
      };

      // Include factor breakdown if requested
      if (includeFactors) {
        (market as any).factors = {
          sentiment: token.sentimentScore,
          trading_velocity: token.trendVelocity,
          volume_spike: token.volume24h,
          price_momentum: token.priceChange24h,
          social_activity: token.mentionVelocity,
          holder_momentum: token.holderMomentum,
          cross_market_correlation: token.crossMarketCorr
        };
        
        (market as any).weights = token.trendFactorWeights;
      }

      return market;
    });

    // Calculate aggregate statistics
    const totalMarkets = await prisma.token.count({
      where: { trendIndexScore: { gt: 0 } }
    });
    
    const totalVolume24h = tokens.reduce((sum, token) => sum + token.volume24h, 0);
    
    // Get unique traders across all markets
    const allTraders = new Set<string>();
    tokens.forEach(token => {
      token.trades.forEach(trade => {
        allTraders.add(trade.traderId);
      });
    });
    const totalTraders = allTraders.size;

    const aggregateStats = {
      total_markets: totalMarkets,
      total_volume_24h: Math.round(totalVolume24h * 100) / 100,
      total_traders: totalTraders,
      avg_trend_score: tokens.length > 0 ? 
        Math.round(tokens.reduce((sum, t) => sum + t.trendIndexScore, 0) / tokens.length * 100) / 100 : 0,
      timestamp: new Date().toISOString()
    };

    // Determine why there are no results
    const reasons = [];
    if (totalTokens === 0) {
      reasons.push("No stories exist in the database");
    } else if (tokensWithTrend === 0) {
      reasons.push(`No stories have trend scores calculated (oracle may not be running or calculated for 0 tokens)`);
    } else if (tokensWithVolume === 0) {
      reasons.push(`No stories have trading volume (${tokensWithTrend} stories have trend scores but 0 volume)`);
    } else if (tokens.length === 0 && tokensWithTrend > 0 && tokensWithVolume > 0) {
      reasons.push(`No stories meet both criteria (trend score > 0 AND volume > 0)`);
    }

    const response = {
      trending_markets: trendingMarkets,
      aggregate_stats: aggregateStats,
      ai_powered: true,
      algorithm: "AI Adaptive Trend Index",
      factors_analyzed: [
        "sentiment",
        "trading_velocity", 
        "volume_spike",
        "price_momentum",
        "social_activity",
        "holder_momentum",
        "cross_market_correlation"
      ],
      // Diagnostic information
      diagnostic: trendingMarkets.length === 0 ? {
        total_stories: totalTokens,
        stories_with_trend_scores: tokensWithTrend,
        stories_with_volume: tokensWithVolume,
        stories_eligible: tokens.length,
        reasons_no_trending: reasons,
        recommendation: totalTokens > 0 
          ? (tokensWithTrend === 0 
              ? "Start the oracle service to calculate trend scores" 
              : tokensWithVolume === 0 
                ? "Create trades/buy tokens to generate volume"
                : "Check if trend scores and volume meet the filtering criteria")
          : "Create news stories first"
      } : undefined
    };

    // Add caching headers
    const headers = new Headers();
    headers.set('Cache-Control', 'max-age=60, s-maxage=60');
    headers.set('X-API-Version', '1.0.0');
    headers.set('X-AI-Powered', 'true');

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error("Error fetching AI-powered trending markets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
