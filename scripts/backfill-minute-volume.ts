import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function alignToUtcMinute(date: Date): Date {
  const ms = date.getTime();
  const aligned = Math.floor(ms / 60000) * 60000;
  return new Date(aligned);
}

async function backfill() {
  console.log("Starting backfill of TokenVolumeMinute from Trade rows...");

  const trades = await prisma.trade.findMany({
    orderBy: [{ tokenId: "asc" }, { timestamp: "asc" }],
    select: {
      id: true,
      tokenId: true,
      timestamp: true,
      amount: true,
      type: true,
    },
  });

  console.log(`Loaded ${trades.length} trades`);

  const bucketKeyToAgg: Record<string, {
    tokenId: string;
    minute: Date;
    volumeSol: number;
    tradeCount: number;
    buyVolumeSol: number;
    sellVolumeSol: number;
  }> = {};

  for (const trade of trades) {
    const minute = alignToUtcMinute(trade.timestamp);
    const key = `${trade.tokenId}|${minute.toISOString()}`;
    if (!bucketKeyToAgg[key]) {
      bucketKeyToAgg[key] = {
        tokenId: trade.tokenId,
        minute,
        volumeSol: 0,
        tradeCount: 0,
        buyVolumeSol: 0,
        sellVolumeSol: 0,
      };
    }
    const agg = bucketKeyToAgg[key];
    agg.tradeCount += 1;
    // Assuming Trade.amount is denominated in SOL
    agg.volumeSol += trade.amount;
    if (trade.type === "BUY") agg.buyVolumeSol += trade.amount;
    if (trade.type === "SELL") agg.sellVolumeSol += trade.amount;
  }

  const aggregates = Object.values(bucketKeyToAgg);
  console.log(`Upserting ${aggregates.length} minute buckets...`);

  const batchSize = 1000;
  for (let i = 0; i < aggregates.length; i += batchSize) {
    const batch = aggregates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((agg) =>
        prisma.tokenVolumeMinute.upsert({
          where: {
            UniqueTokenMinute: { tokenId: agg.tokenId, minute: agg.minute },
          },
          create: {
            tokenId: agg.tokenId,
            minute: agg.minute,
            volumeSol: agg.volumeSol,
            tradeCount: agg.tradeCount,
            buyVolumeSol: agg.buyVolumeSol,
            sellVolumeSol: agg.sellVolumeSol,
          },
          update: {
            volumeSol: agg.volumeSol,
            tradeCount: agg.tradeCount,
            buyVolumeSol: agg.buyVolumeSol,
            sellVolumeSol: agg.sellVolumeSol,
          },
        })
      )
    );
    console.log(`Upserted ${Math.min(i + batchSize, aggregates.length)} / ${aggregates.length}`);
  }

  console.log("Backfill complete.");
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


