import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrCreateUser, isValidWalletAddress } from "@/lib/user-utils"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/notifications?wallet=...&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 100)

  if (!wallet || !isValidWalletAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } })
  if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 })

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH /api/notifications - body: { wallet, ids?: string[], mark: "read"|"unread" }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { wallet, ids, mark } = body || {}

  if (!wallet || !isValidWalletAddress(wallet) || !["read", "unread"].includes(mark)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  const user = await getOrCreateUser(wallet)

  await prisma.notification.updateMany({
    where: { userId: user.id, ...(Array.isArray(ids) && ids.length ? { id: { in: ids } } : {}) },
    data: { read: mark === "read" },
  })

  const unreadCount = await prisma.notification.count({ where: { userId: user.id, read: false } })
  return NextResponse.json({ ok: true, unreadCount })
}


