import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// Cast to any to avoid type drift when Prisma Client types lag editor reloads
const db: any = prisma;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tokenId } = await params;
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "24h"; // 1h, 24h, 7d
    const limit = parseInt(searchParams.get("limit") || "1440");

    const now = new Date();
    let startTime: Date;
    switch (timeframe) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "24h":
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const rows = await db.tokenVolumeMinute.findMany({
      where: {
        tokenId,
        minute: { gte: startTime },
      },
      orderBy: { minute: "asc" },
      take: limit,
      select: {
        minute: true,
        volumeSol: true,
        tradeCount: true,
        buyVolumeSol: true,
        sellVolumeSol: true,
      },
    });

    return NextResponse.json({
      tokenId,
      timeframe,
      points: rows.map((r: { minute: Date; volumeSol: number; tradeCount: number; buyVolumeSol: number; sellVolumeSol: number; }) => ({
        timestamp: r.minute.toISOString(),
        volumeSol: r.volumeSol,
        tradeCount: r.tradeCount,
        buyVolumeSol: r.buyVolumeSol,
        sellVolumeSol: r.sellVolumeSol,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch volume series" }, { status: 500 });
  }
}

// Optional provisional upsert to smooth UX before oracle writes arrive
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tokenId } = await params;
    const body = await request.json();
    const { timestamp, volumeSol, type } = body as { timestamp?: string; volumeSol: number; type?: 'BUY' | 'SELL' };

    if (!tokenId || typeof volumeSol !== 'number' || volumeSol <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const minute = new Date(timestamp ? timestamp : Math.floor(Date.now() / 60000) * 60000);

    const existing = await db.tokenVolumeMinute.findUnique({
      where: { UniqueTokenMinute: { tokenId, minute } },
    });

    if (existing) {
      await db.tokenVolumeMinute.update({
        where: { id: existing.id },
        data: {
          volumeSol: existing.volumeSol + volumeSol,
          tradeCount: existing.tradeCount + 1,
          buyVolumeSol: type === 'BUY' ? existing.buyVolumeSol + volumeSol : existing.buyVolumeSol,
          sellVolumeSol: type === 'SELL' ? existing.sellVolumeSol + volumeSol : existing.sellVolumeSol,
        },
      });
    } else {
      await db.tokenVolumeMinute.create({
        data: {
          tokenId,
          minute,
          volumeSol,
          tradeCount: 1,
          buyVolumeSol: type === 'BUY' ? volumeSol : 0,
          sellVolumeSol: type === 'SELL' ? volumeSol : 0,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed provisional upsert' }, { status: 500 });
  }
}
