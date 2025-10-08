import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schemas
const createStorySchema = z.object({
  headline: z.string().min(1, "Headline is required").max(500, "Headline too long"),
  originalUrl: z.string().url("Invalid URL"),
  tags: z.array(z.string()).optional().default([]),
})

// POST /api/story - Create a new story
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createStorySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }

    const { headline, originalUrl, tags } = validation.data

    // Check if story with this URL already exists
    const existingStory = await prisma.story.findUnique({
      where: { originalUrl }
    })

    if (existingStory) {
      return NextResponse.json(
        { error: "Story with this URL already exists" },
        { status: 409 }
      )
    }

    // Create story first
    const story = await prisma.story.create({
      data: {
        headline,
        originalUrl,
        submitterId: session.user.id,
      },
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
      }
    })

    // Create associated token
    await prisma.token.create({
      data: {
        storyId: story.id,
        price: 0.01,
        priceChange24h: 0,
        volume24h: 0,
        marketCap: 0
      }
    })

    // Connect tags if any
    if (tags.length > 0) {
      for (const tagName of tags) {
        await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {}
        })
        
        await prisma.story.update({
          where: { id: story.id },
          data: {
            tags: {
              connect: { name: tagName }
            }
          }
        })
      }
    }

    // Fetch the complete story with all relations
    const completeStory = await prisma.story.findUnique({
      where: { id: story.id },
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
      }
    })

    return NextResponse.json(completeStory, { status: 201 })

  } catch (error) {
    console.error("Error creating story:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/story - Get all stories
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const tag = searchParams.get("tag")
    const search = searchParams.get("search")

    // Build where clause
    const where: any = {}
    
    if (tag) {
      where.tags = {
        some: {
          name: tag
        }
      }
    }

    if (search) {
      where.headline = {
        contains: search
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
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.story.count({ where })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

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
    console.error("Error fetching stories:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
