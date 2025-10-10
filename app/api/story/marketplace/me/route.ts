import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/story/marketplace/me - Get all stories owned by the authenticated user that are NOT on the market
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Fetching user stories not on market...')
    
    // Get the authenticated user session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build where clause - stories owned by user where onMarket is false
    const where: any = {
      submitterId: session.user.id,
      onMarket: false
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

    console.log(`[API] Found ${stories.length} user stories not on market out of ${totalCount} total`)

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
    console.error("Error fetching user stories not on market:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
