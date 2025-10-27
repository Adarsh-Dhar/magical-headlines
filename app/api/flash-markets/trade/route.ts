import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { marketId, walletAddress, direction, amount } = await request.json();
  
  // Validate market is active
  const market = await prisma.flashTrendMarket.findUnique({
    where: { id: marketId },
  });
  
  if (!market || !market.isActive) {
    return NextResponse.json({ error: "Market not active" }, { status: 400 });
  }
  
  if (new Date() > market.endTimestamp) {
    return NextResponse.json({ error: "Market expired" }, { status: 400 });
  }
  
  // Create position
  const position = await prisma.flashTrendPosition.create({
    data: {
      marketId,
      userId: walletAddress,
      walletAddress,
      direction,
      amount,
    },
  });
  
  // Update market totals
  await prisma.flashTrendMarket.update({
    where: { id: marketId },
    data: {
      [direction === 'up' ? 'totalUpAmount' : 'totalDownAmount']: {
        increment: amount,
      },
      participantCount: { increment: 1 },
    },
  });
  
  return NextResponse.json({ success: true, position });
}

