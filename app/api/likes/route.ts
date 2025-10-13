import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser, isValidWalletAddress } from "@/lib/user-utils"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/likes?storyId=...&walletAddress=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get("storyId")
    const walletAddress = searchParams.get("walletAddress")

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 })
    }

    const count = await prisma.like.count({ where: { storyId } })

    let liked = false
    if (walletAddress && isValidWalletAddress(walletAddress)) {
      const user = await prisma.user.findUnique({ where: { walletAddress } })
      if (user) {
        const existing = await prisma.like.findFirst({
          where: { storyId, userId: user.id },
        })
        liked = !!existing
      }
    }

    return NextResponse.json({ count, liked })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/likes { storyId, walletAddress }
// Toggles like on/off
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storyId, walletAddress } = body || {}

    if (!storyId || !walletAddress) {
      return NextResponse.json({ error: "storyId and walletAddress are required" }, { status: 400 })
    }
    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
    }

    // Ensure story exists
    const story = await prisma.story.findUnique({ where: { id: storyId } })
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }

    const user = await getOrCreateUser(walletAddress)

    const existing = await prisma.like.findFirst({
      where: { storyId, userId: user.id },
    })

    let liked
    if (existing) {
      await prisma.like.deleteMany({ where: { storyId, userId: user.id } })
      liked = false
    } else {
      await prisma.like.create({ data: { storyId, userId: user.id } })
      liked = true
    }

    const count = await prisma.like.count({ where: { storyId } })
    return NextResponse.json({ liked, count })
  } catch (error) {
    console.error('[API] Likes POST failed:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


