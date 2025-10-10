import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/story/marketplace - Get all stories that are on the market
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Fetching marketplace stories...')
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build where clause - only stories where onMarket is true
    const where: any = {
      onMarket: true
    }
    
    if (search) {
      where.headline = {
        contains: search
      }
    }

    // Build orderBy clause
    let orderBy: any = {}
    
    if (sortBy === "price" || sortBy === "volume24h" || sortBy === "marketCap") {
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

    // Get stories with pagination
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
          token: true
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

    console.log(`[API] Found ${stories.length} marketplace stories out of ${totalCount} total`)

    return NextResponse.json({
      stories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    })

  } catch (error) {
    console.error("Error fetching marketplace stories:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
