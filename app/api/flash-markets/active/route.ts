import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const activeMarkets = await prisma.flashTrendMarket.findMany({
      where: { isActive: true },
      include: {
        positions: {
          select: {
            direction: true,
            amount: true,
          },
        },
      },
      orderBy: { startTimestamp: 'desc' },
    });
    
    return NextResponse.json({ markets: activeMarkets || [] });
  } catch (error) {
    console.error("Error fetching active flash markets:", error);
    return NextResponse.json({ markets: [] }, { status: 500 });
  }
}

