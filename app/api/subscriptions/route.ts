import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser, isValidWalletAddress } from "@/lib/user-utils"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/subscriptions?authorWallet=...&subscriberWallet=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authorWallet = searchParams.get("authorWallet")
    const subscriberWallet = searchParams.get("subscriberWallet")

    if (!authorWallet || !isValidWalletAddress(authorWallet)) {
      return NextResponse.json({ error: "authorWallet is required" }, { status: 400 })
    }

    const author = await prisma.user.findUnique({ where: { walletAddress: authorWallet } })
    if (!author) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 })
    }

    const count = await prisma.subscription.count({ where: { authorId: author.id } })

    let subscribed = false
    if (subscriberWallet && isValidWalletAddress(subscriberWallet)) {
      const subscriber = await prisma.user.findUnique({ where: { walletAddress: subscriberWallet } })
      if (subscriber) {
        const existing = await prisma.subscription.findUnique({
          where: { UniqueSubscription: { subscriberId: subscriber.id, authorId: author.id } },
        })
        subscribed = !!existing
      }
    }

    return NextResponse.json({ count, subscribed })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/subscriptions { authorWallet, subscriberWallet }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { authorWallet, subscriberWallet } = body || {}

    if (!authorWallet || !subscriberWallet) {
      return NextResponse.json({ error: "authorWallet and subscriberWallet are required" }, { status: 400 })
    }
    if (!isValidWalletAddress(authorWallet) || !isValidWalletAddress(subscriberWallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
    }
    if (authorWallet === subscriberWallet) {
      return NextResponse.json({ error: "Cannot subscribe to yourself" }, { status: 400 })
    }

    const author = await getOrCreateUser(authorWallet)
    const subscriber = await getOrCreateUser(subscriberWallet)

    const existing = await prisma.subscription.findUnique({
      where: { UniqueSubscription: { subscriberId: subscriber.id, authorId: author.id } },
    })

    let subscribed
    if (existing) {
      await prisma.subscription.delete({ where: { id: existing.id } })
      subscribed = false
    } else {
      await prisma.subscription.create({ data: { subscriberId: subscriber.id, authorId: author.id } })
      subscribed = true
    }

    const count = await prisma.subscription.count({ where: { authorId: author.id } })
    return NextResponse.json({ subscribed, count })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


