import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schemas
const createStorySchema = z.object({
  headline: z.string().min(1, "Headline is required").max(500, "Headline too long"),
  content: z.string().min(1, "Content is required").max(10000, "Content too long"),
  originalUrl: z.string().url("Invalid URL"),
  arweaveUrl: z.string().url("Invalid Arweave URL"),
  arweaveId: z.string().min(1, "Arweave ID is required"),
  onchainSignature: z.string().min(1, "Onchain signature is required"),
  tags: z.array(z.string()).optional().default([]),
})

// POST /api/story - Create a new story
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Story creation request received')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('[API] Session check:', { hasSession: !!session, userId: session?.user?.id })
    
    if (!session?.user?.id) {
      console.log('[API] No session found, returning 401')
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Ensure user exists in database (for JWT strategy)
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      // Create user if they don't exist in database
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email || null,
          name: session.user.name || null,
          walletAddress: session.user.walletAddress || `user_${session.user.id}`,
        }
      })
    }

    // Parse and validate request body
    const body = await request.json()
    console.log('[API] Request body received:', { 
      headline: body.headline, 
      hasContent: !!body.content, 
      originalUrl: body.originalUrl,
      hasArweaveUrl: !!body.arweaveUrl,
      hasArweaveId: !!body.arweaveId,
      hasOnchainSignature: !!body.onchainSignature,
      tagsCount: body.tags?.length || 0
    })
    
    const validation = createStorySchema.safeParse(body)
    
    if (!validation.success) {
      console.log('[API] Validation failed:', validation.error.errors)
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }
    
    console.log('[API] Validation passed, proceeding with story creation')

    const { headline, content, originalUrl, arweaveUrl, arweaveId, onchainSignature, tags } = validation.data

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

    // Verify onchain transaction exists (basic validation)
    if (!onchainSignature || onchainSignature.length < 80) {
      return NextResponse.json(
        { error: "Invalid onchain transaction signature" },
        { status: 400 }
      )
    }

    // Create story with all the new fields
    console.log('[API] Creating story in database...')
    const story = await prisma.story.create({
      data: {
        headline,
        content,
        originalUrl,
        arweaveUrl,
        arweaveId,
        onchainSignature,
        submitterId: user.id,
      } as any,
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
    console.log('[API] Story created successfully:', story.id)

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

    console.log('[API] Returning complete story:', completeStory.id)
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
