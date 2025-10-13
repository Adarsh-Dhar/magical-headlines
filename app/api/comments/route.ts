import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser, isValidWalletAddress } from "@/lib/user-utils"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/comments?storyId=...&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get("storyId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"))

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 })
    }

    const skip = (page - 1) * limit

    const [comments, totalCount] = await Promise.all([
      prisma.comment.findMany({
        where: { storyId },
        include: {
          user: { select: { id: true, name: true, walletAddress: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where: { storyId } }),
    ])

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/comments { storyId, walletAddress, content }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storyId, walletAddress, content } = body || {}

    if (!storyId || !walletAddress || !content) {
      return NextResponse.json({ error: "storyId, walletAddress and content are required" }, { status: 400 })
    }
    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
    }
    if (typeof content !== 'string' || content.trim().length === 0 || content.length > 1000) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 })
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } })
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }

    const user = await getOrCreateUser(walletAddress)

    const comment = await prisma.comment.create({
      data: {
        storyId,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, walletAddress: true } },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


