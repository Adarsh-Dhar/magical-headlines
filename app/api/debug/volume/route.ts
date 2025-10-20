import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Debug endpoint to check recent volume data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!tokenId) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }

    // Get recent volume minutes for the token
    const recentVolume = await prisma.tokenVolumeMinute.findMany({
      where: { tokenId },
      orderBy: { minute: "desc" },
      take: limit,
      select: {
        minute: true,
        volumeSol: true,
        tradeCount: true,
        buyVolumeSol: true,
        sellVolumeSol: true,
      }
    });

    // Get total trade count for the token
    const totalTrades = await prisma.trade.count({
      where: { tokenId }
    });

    // Get token info
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      select: {
        id: true,
        price: true,
        volume24h: true,
        marketAccount: true,
        mintAccount: true,
        newsAccount: true,
      }
    });

    return NextResponse.json({
      token,
      totalTrades,
      recentVolumeMinutes: recentVolume,
      summary: {
        totalVolumeMinutes: recentVolume.length,
        latestMinute: recentVolume[0]?.minute || null,
        totalVolumeInRecent: recentVolume.reduce((sum, r) => sum + r.volumeSol, 0),
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch debug data" }, { status: 500 });
  }
}
