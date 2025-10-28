import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema
const updateTokenSchema = z.object({
  storyId: z.string().min(1, "Story ID is required"),
  mintAccount: z.string().min(1, "Mint account is required"),
  marketAccount: z.string().min(1, "Market account is required"),
  newsAccount: z.string().min(1, "News account is required"),
  signature: z.string().min(1, "Transaction signature is required"),
  nonce: z.string().optional(), // Optional nonce update for retry scenarios
})

// POST /api/story/update-token - Update token with on-chain addresses
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating token with on-chain addresses')
    
    // Parse and validate request body
    const body = await request.json()
    const validation = updateTokenSchema.safeParse(body)
    
    if (!validation.success) {
      console.error('❌ Invalid input:', validation.error.errors)
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { storyId, mintAccount, marketAccount, newsAccount, signature, nonce } = validation.data

    // Find the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { token: true }
    })

    if (!story) {
      console.error('❌ Story not found:', storyId)
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      )
    }

    if (!story.token) {
      console.error('❌ Story has no token:', storyId)
      return NextResponse.json(
        { error: "Story has no token" },
        { status: 400 }
      )
    }

    // Update token with on-chain addresses
    const updatedToken = await prisma.token.update({
      where: { id: story.token.id },
      data: {
        mintAccount,
        marketAccount,
        newsAccount
      }
    })

    // Update story to mark it as on-market (and optionally update nonce if provided)
    const storyUpdateData: any = { onMarket: true }
    if (nonce) {
      storyUpdateData.nonce = nonce
      console.log('📝 Updating nonce to:', nonce)
    }
    
    await prisma.story.update({
      where: { id: storyId },
      data: storyUpdateData
    })

    console.log('✅ Token updated with on-chain addresses:', {
      storyId,
      mintAccount,
      marketAccount,
      newsAccount,
      signature
    })

    return NextResponse.json({
      success: true,
      message: "Token updated with on-chain addresses",
      data: {
        storyId,
        token: updatedToken,
        signature
      }
    })

  } catch (error) {
    console.error('❌ Error updating token:', error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
