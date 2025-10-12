import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser, isValidWalletAddress } from "@/lib/user-utils"
import { z } from "zod"

// Validation schemas
const createStorySchema = z.object({
  headline: z.string().min(1, "Headline is required").max(500, "Headline too long"),
  content: z.string().min(1, "Content is required").max(10000, "Content too long"),
  originalUrl: z.string().url("Invalid URL"),
  arweaveUrl: z.string().url("Invalid Arweave URL"),
  arweaveId: z.string().min(1, "Arweave ID is required"),
  onchainSignature: z.string().min(1, "Onchain signature is required"),
  authorAddress: z.string().min(1, "Author address is required"),
  nonce: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
})

// POST /api/story - Create a new story
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Story creation request received')
    
    // Parse and validate request body
    const body = await request.json()
    console.log('[API] Request body received:', { 
      headline: body.headline, 
      hasContent: !!body.content, 
      originalUrl: body.originalUrl,
      hasArweaveUrl: !!body.arweaveUrl,
      hasArweaveId: !!body.arweaveId,
      hasOnchainSignature: !!body.onchainSignature,
      authorAddress: body.authorAddress,
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

    const { headline, content, originalUrl, arweaveUrl, arweaveId, onchainSignature, authorAddress, nonce, tags } = validation.data

    // Validate wallet address
    if (!isValidWalletAddress(authorAddress)) {
      console.log('[API] Invalid wallet address provided')
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      )
    }

    // Get or create user by wallet address
    const user = await getOrCreateUser(authorAddress)
    console.log('[API] User found/created:', { userId: user.id, walletAddress: user.walletAddress })

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
    // Allow placeholder signatures for already-processed transactions
    const isPlaceholderSignature = onchainSignature.startsWith('already-processed-')
    console.log('[API] Onchain signature validation:', { 
      signature: onchainSignature, 
      isPlaceholder: isPlaceholderSignature, 
      length: onchainSignature.length 
    })
    
    if (!onchainSignature || (!isPlaceholderSignature && onchainSignature.length < 80)) {
      console.log('[API] Invalid onchain signature rejected')
      return NextResponse.json(
        { error: "Invalid onchain transaction signature" },
        { status: 400 }
      )
    }

    // Create story with all the new fields
    console.log('[API] Creating story in database...', isPlaceholderSignature ? '(with placeholder signature)' : '')
    const story = await prisma.story.create({
      data: {
        headline,
        content,
        originalUrl,
        arweaveUrl,
        arweaveId,
        onchainSignature,
        authorAddress,
        nonce,
        submitterId: user.id,
      } as any,
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
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

// GET /api/story - Get all stories or single story by ID
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    // If ID is provided, fetch single story
    if (id) {
      const story = await prisma.story.findUnique({
        where: { id },
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              walletAddress: true
            }
          },
          tags: true,
          token: true
        }
      })
      
      if (!story) {
        return NextResponse.json(
          { error: "Story not found" },
          { status: 404 }
        )
      }
      
      return NextResponse.json(story)
    }
    
    // Otherwise, fetch all stories with pagination
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const tag = searchParams.get("tag")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

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
