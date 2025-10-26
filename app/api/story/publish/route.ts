import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema
const publishStorySchema = z.object({
  storyId: z.string().min(1, "Story ID is required"),
})

// POST /api/story/publish - Manually publish an existing story on-chain
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual story publishing request received')
    
    // Parse and validate request body
    const body = await request.json()
    const validation = publishStorySchema.safeParse(body)
    
    if (!validation.success) {
      console.error('❌ Invalid input:', validation.error.errors)
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { storyId } = validation.data

    // Find the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        token: true,
        submitter: {
          select: {
            id: true,
            name: true,
            walletAddress: true
          }
        }
      }
    })

    if (!story) {
      console.error('❌ Story not found:', storyId)
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      )
    }

    // Check if story already has token data
    if (story.token?.mintAccount && story.token?.marketAccount) {
      console.log('⚠️ Story already has token data:', {
        storyId,
        mintAccount: story.token.mintAccount,
        marketAccount: story.token.marketAccount
      })
      return NextResponse.json(
        { 
          error: "Story already has token data",
          existingData: {
            mintAccount: story.token.mintAccount,
            marketAccount: story.token.marketAccount,
            newsAccount: story.token.newsAccount
          }
        },
        { status: 409 }
      )
    }

    // Validate required fields
    if (!story.authorAddress) {
      console.error('❌ Story missing author address:', storyId)
      return NextResponse.json(
        { error: "Story missing author address" },
        { status: 400 }
      )
    }

    if (!story.arweaveUrl) {
      console.error('❌ Story missing Arweave URL:', storyId)
      return NextResponse.json(
        { error: "Story missing Arweave URL" },
        { status: 400 }
      )
    }

    console.log('📝 Publishing story on-chain:', {
      storyId,
      headline: story.headline.substring(0, 50) + '...',
      authorAddress: story.authorAddress,
      nonce: story.nonce || '0'
    })

    // Import and use the server contract service
    const { serverContractService } = await import('@/lib/server-contract-service')
    
    const onChainResult = await serverContractService.publishNewsOnChain({
      headline: story.headline,
      arweaveLink: story.arweaveUrl,
      initialSupply: parseInt(process.env.INITIAL_TOKEN_SUPPLY || '1000'),
      basePrice: parseInt(process.env.BASE_TOKEN_PRICE || '1000000'),
      nonce: parseInt(story.nonce || '0'),
      authorAddress: story.authorAddress
    })

    if (onChainResult.success) {
      console.log('✅ Story published on-chain successfully:', {
        signature: onChainResult.signature,
        mintAccount: onChainResult.mintAccount,
        marketAccount: onChainResult.marketAccount,
        newsAccount: onChainResult.newsAccount
      })

      // Update token with on-chain addresses
      const updatedToken = await prisma.token.update({
        where: { id: story.token?.id },
        data: {
          mintAccount: onChainResult.mintAccount,
          marketAccount: onChainResult.marketAccount,
          newsAccount: onChainResult.newsAccount
        }
      })

      // Update story to mark it as on-market
      await prisma.story.update({
        where: { id: story.id },
        data: { onMarket: true }
      })

      console.log('✅ Token record updated with on-chain addresses')

      return NextResponse.json({
        success: true,
        message: "Story published on-chain successfully",
        data: {
          storyId: story.id,
          signature: onChainResult.signature,
          mintAccount: onChainResult.mintAccount,
          marketAccount: onChainResult.marketAccount,
          newsAccount: onChainResult.newsAccount,
          token: updatedToken
        }
      })
    } else {
      console.error('❌ Failed to publish on-chain:', onChainResult.error)
      return NextResponse.json(
        { 
          error: "Failed to publish on-chain", 
          details: onChainResult.error 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in manual story publishing:', error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/story/publish - Get stories that need publishing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Find stories without token data
    const stories = await prisma.story.findMany({
      where: {
        OR: [
          { token: null },
          { 
            token: {
              OR: [
                { mintAccount: null },
                { marketAccount: null }
              ]
            }
          }
        ]
      },
      include: {
        token: true,
        submitter: {
          select: {
            id: true,
            name: true,
            walletAddress: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await prisma.story.count({
      where: {
        OR: [
          { token: null },
          { 
            token: {
              OR: [
                { mintAccount: null },
                { marketAccount: null }
              ]
            }
          }
        ]
      }
    })

    return NextResponse.json({
      stories,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('❌ Error fetching stories for publishing:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
