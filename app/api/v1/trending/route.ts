/**
 * @swagger
 * /trending:
 *   get:
 *     tags:
 *       - Markets
 *     summary: Get trending markets
 *     description: Retrieve the top 10 trending news markets ranked by 24-hour trading volume. This endpoint provides real-time financial attention data for institutional clients.
 *     operationId: getTrendingMarkets
 *     responses:
 *       200:
 *         description: Successfully retrieved trending markets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendingResponse'
 *             example:
 *               trending_markets:
 *                 - rank: 1
 *                   market_id: "cmh29uvob0003u6h0lzdzvex9"
 *                   headline: "Federal Reserve Announces Interest Rate Decision"
 *                   volume_24h: 1250.67
 *                   current_price: 0.045
 *                   price_change_24h: 12.5
 *                   market_cap: 45000.0
 *                   tags:
 *                     - id: "fed"
 *                       name: "Federal Reserve"
 *                   traders_count: 156
 *                   created_at: "2025-10-22T17:33:19.451Z"
 *               aggregate_stats:
 *                 total_markets: 45
 *                 total_volume_24h: 1250.67
 *                 total_traders: 234
 *                 timestamp: "2025-10-22T17:51:28.517Z"
 *         headers:
 *           X-API-Version:
 *             description: API version
 *             schema:
 *               type: string
 *               example: "1.0.0"
 *           Cache-Control:
 *             description: Caching directive
 *             schema:
 *               type: string
 *               example: "max-age=60, s-maxage=60"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Internal server error"
 *               message: "Failed to fetch trending markets data"
 * 
 * Trending Markets API v1
 * 
 * Purpose: Financial attention feed for institutional clients
 * 
 * This endpoint provides real-time, financially-weighted attention data by ranking
 * markets based on 24-hour trading volume. Designed for hedge funds, media companies,
 * and trading bots to identify trending news markets.
 * 
 * Response Format:
 * - trending_markets: Array of top 10 markets ranked by volume
 * - aggregate_stats: Overall market statistics
 * 
 * Rate Limiting: Currently unlimited (future: API key-based rate limiting)
 * 
 * Example Use Cases:
 * - Hedge funds: Identify high-volume news for trading strategies
 * - Media companies: Track which stories are gaining financial attention
 * - Trading bots: Automated market sentiment analysis
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Fetch all tokens with their associated data, ordered by 24h volume
    const tokens = await prisma.token.findMany({
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
        }
      },
      orderBy: { 
        volume24h: 'desc' 
      }
    })

    // Get top 10 trending markets
    const trendingMarkets = tokens.slice(0, 10).map((token, index) => ({
      rank: index + 1,
      market_id: token.id,
      headline: token.story.headline,
      volume_24h: token.volume24h,
      current_price: token.price,
      price_change_24h: token.priceChange24h,
      market_cap: token.marketCap,
      tags: token.story.tags.map(tag => ({
        id: tag.id,
        name: tag.name
      })),
      traders_count: token.trades.length,
      created_at: token.createdAt.toISOString()
    }))

    // Calculate aggregate statistics
    const totalMarkets = tokens.length
    const totalVolume24h = tokens.reduce((sum, token) => sum + token.volume24h, 0)
    
    // Get unique traders across all markets
    const allTraders = new Set<string>()
    tokens.forEach(token => {
      token.trades.forEach(trade => {
        allTraders.add(trade.traderId)
      })
    })
    const totalTraders = allTraders.size

    const aggregateStats = {
      total_markets: totalMarkets,
      total_volume_24h: Math.round(totalVolume24h * 100) / 100, // Round to 2 decimal places
      total_traders: totalTraders,
      timestamp: new Date().toISOString()
    }

    const response = {
      trending_markets: trendingMarkets,
      aggregate_stats: aggregateStats
    }

    // Add caching headers and API version for 1-minute cache
    const headers = new Headers()
    headers.set('Cache-Control', 'max-age=60, s-maxage=60')
    headers.set('Content-Type', 'application/json')
    headers.set('X-API-Version', '1.0.0')
    headers.set('X-API-Deprecation-Notice', 'This API version is current and supported')

    return NextResponse.json(response, { 
      status: 200,
      headers 
    })

  } catch (error) {
    console.error("Error fetching trending markets:", error)
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to fetch trending markets data"
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}
