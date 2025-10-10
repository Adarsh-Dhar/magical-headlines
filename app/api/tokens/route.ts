import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tokens - Get all news tokens with advanced filtering and sorting
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100) // Cap at 100
    const search = searchParams.get("search")
    const tag = searchParams.get("tag")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const minVolume = searchParams.get("minVolume")
    const maxVolume = searchParams.get("maxVolume")
    const minMarketCap = searchParams.get("minMarketCap")
    const maxMarketCap = searchParams.get("maxMarketCap")

    // Build where clause
    const where: any = {
      token: {
        isNot: null // Only include stories that have tokens
      }
    }
    
    // Text search
    if (search) {
      where.headline = {
        contains: search,
        mode: "insensitive"
      }
    }

    // Tag filter
    if (tag) {
      where.tags = {
        some: {
          name: {
            equals: tag,
            mode: "insensitive"
          }
        }
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.token = {
        ...where.token,
        price: {
          ...(minPrice && { gte: parseFloat(minPrice) }),
          ...(maxPrice && { lte: parseFloat(maxPrice) })
        }
      }
    }

    // Volume range filter
    if (minVolume || maxVolume) {
      where.token = {
        ...where.token,
        volume24h: {
          ...(minVolume && { gte: parseFloat(minVolume) }),
          ...(maxVolume && { lte: parseFloat(maxVolume) })
        }
      }
    }

    // Market cap range filter
    if (minMarketCap || maxMarketCap) {
      where.token = {
        ...where.token,
        marketCap: {
          ...(minMarketCap && { gte: parseFloat(minMarketCap) }),
          ...(maxMarketCap && { lte: parseFloat(maxMarketCap) })
        }
      }
    }

    // Build orderBy clause
    let orderBy: any = {}
    
    if (sortBy === "price" || sortBy === "volume24h" || sortBy === "marketCap" || sortBy === "priceChange24h") {
      // Sort by token properties
      orderBy = {
        token: {
          [sortBy]: sortOrder
        }
      }
    } else {
      // Sort by story properties
      orderBy = {
        [sortBy]: sortOrder
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get stories with tokens
    const [stories, totalCount] = await Promise.all([
      prisma.story.findMany({
        where,
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
              walletAddress: true
            }
          },
          tags: true,
          token: {
            include: {
              holders: {
                select: {
                  amount: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      walletAddress: true
                    }
                  }
                }
              },
              trades: {
                select: {
                  id: true,
                  type: true,
                  amount: true,
                  priceAtTrade: true,
                  timestamp: true,
                  trader: {
                    select: {
                      id: true,
                      name: true,
                      walletAddress: true
                    }
                  }
                },
                orderBy: {
                  timestamp: "desc"
                },
                take: 10 // Latest 10 trades
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.story.count({ where })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Transform data for better API response
    const tokens = stories.map(story => ({
      id: story.id,
      headline: story.headline,
      content: story.content,
      originalUrl: story.originalUrl,
      arweaveUrl: story.arweaveUrl,
      arweaveId: story.arweaveId,
      onchainSignature: story.onchainSignature,
      submitter: story.submitter,
      tags: story.tags,
      token: story.token ? {
        id: story.token.id,
        price: story.token.price,
        priceChange24h: story.token.priceChange24h,
        volume24h: story.token.volume24h,
        marketCap: story.token.marketCap,
        holders: story.token.holders,
        recentTrades: story.token.trades,
        createdAt: story.token.createdAt
      } : null,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt
    }))

    return NextResponse.json({
      tokens,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        search,
        tag,
        sortBy,
        sortOrder,
        priceRange: {
          min: minPrice ? parseFloat(minPrice) : null,
          max: maxPrice ? parseFloat(maxPrice) : null
        },
        volumeRange: {
          min: minVolume ? parseFloat(minVolume) : null,
          max: maxVolume ? parseFloat(maxVolume) : null
        },
        marketCapRange: {
          min: minMarketCap ? parseFloat(minMarketCap) : null,
          max: maxMarketCap ? parseFloat(maxMarketCap) : null
        }
      }
    })

  } catch (error) {
    console.error("Error fetching news tokens:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
