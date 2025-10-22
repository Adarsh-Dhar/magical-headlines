import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Interval = "1h";

interface OhlcItem {
  time: number; // seconds since epoch (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
}

function getQueryParam(request: NextRequest, key: string, fallback: string) {
  const { searchParams } = new URL(request.url);
  return searchParams.get(key) || fallback;
}

function floorToHour(date: Date): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: tokenId } = await context.params;
    if (!tokenId) {
      return NextResponse.json({ error: "Missing token id" }, { status: 400 });
    }

    // Only support 7d/1h for now; keep params for future extension
    const range = getQueryParam(request, "range", "7d");
    const interval = getQueryParam(request, "interval", "1h") as Interval;

    if (range !== "7d" || interval !== "1h") {
      return NextResponse.json({ error: "Unsupported range/interval" }, { status: 400 });
    }

    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch trades for token in the last 7 days
    const trades = await prisma.trade.findMany({
      where: {
        tokenId,
        timestamp: { gte: start },
      },
      orderBy: { timestamp: "asc" },
      select: { timestamp: true, priceAtTrade: true },
    });

    // If no trades, fall back to flat candles from current token price
    if (trades.length === 0) {
      const token = await prisma.token.findUnique({ where: { id: tokenId }, select: { price: true } });
      const basePrice = token?.price ?? 0;

      const candles: OhlcItem[] = [];
      const cursor = floorToHour(start);
      while (cursor <= now) {
        const tSec = Math.floor(cursor.getTime() / 1000);
        candles.push({ time: tSec, open: basePrice, high: basePrice, low: basePrice, close: basePrice });
        cursor.setUTCHours(cursor.getUTCHours() + 1);
      }

      return NextResponse.json(candles);
    }

    // Aggregate by 1h buckets
    const buckets = new Map<number, { open: number; high: number; low: number; close: number }>();

    for (const tr of trades) {
      const bucketStart = floorToHour(tr.timestamp);
      const key = Math.floor(bucketStart.getTime() / 1000);
      const price = tr.priceAtTrade;
      if (!buckets.has(key)) {
        buckets.set(key, { open: price, high: price, low: price, close: price });
      } else {
        const b = buckets.get(key)!;
        // update high/low
        if (price > b.high) b.high = price;
        if (price < b.low) b.low = price;
        // close is latest in ascending order iteration
        b.close = price;
      }
    }

    // Ensure continuity: fill missing hours with previous close
    const candles: OhlcItem[] = [];
    const cursor = floorToHour(start);
    let prevClose: number | null = null;
    while (cursor <= now) {
      const key = Math.floor(cursor.getTime() / 1000);
      const bucket = buckets.get(key);
      if (bucket) {
        candles.push({ time: key, open: bucket.open, high: bucket.high, low: bucket.low, close: bucket.close });
        prevClose = bucket.close;
      } else {
        const price = prevClose ?? trades[0].priceAtTrade;
        candles.push({ time: key, open: price, high: price, low: price, close: price });
      }
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }

    return NextResponse.json(candles);
  } catch (error) {
    return NextResponse.json({ error: "Failed to build OHLC" }, { status: 500 });
  }
}
