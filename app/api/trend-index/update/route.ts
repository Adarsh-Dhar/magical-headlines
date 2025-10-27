import { NextRequest, NextResponse } from "next/server";
import { serverContractService } from "@/lib/server-contract-service";
import { prisma } from "@/lib/prisma";
import { calculateTrendIndex } from "@/lib/oracle-client";
import * as crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { tokenId, newsAccountAddress } = await request.json();
    
    if (!tokenId || !newsAccountAddress) {
      return NextResponse.json(
        { error: "Token ID and news account address are required" },
        { status: 400 }
      );
    }

    // Get token data
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        story: true,
        trendHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Call real MagicBlock AI Oracle
    console.log(`🤖 Calculating trend index for token ${tokenId}...`);
    const aiResponse = await calculateTrendIndex(tokenId);
    
    if (!aiResponse) {
      return NextResponse.json(
        { error: "Failed to calculate trend index - MagicBlock AI Oracle unavailable" },
        { status: 503 }
      );
    }

    const trendResult = aiResponse.result;
    const trendScore = trendResult.score; // Already 0-100 scale
    
    // Generate factors hash from AI-computed factors
    const factorsString = JSON.stringify({
      sentiment: trendResult.factors.sentiment,
      tradingVelocity: trendResult.factors.tradingVelocity,
      volumeSpike: trendResult.factors.volumeSpike,
      priceMomentum: trendResult.factors.priceMomentum,
      socialActivity: trendResult.factors.socialActivity,
      holderMomentum: trendResult.factors.holderMomentum,
      crossMarketCorr: trendResult.factors.crossMarketCorr
    });
    const factorsHash = crypto.createHash('sha256').update(factorsString).digest('hex');

    // Update on-chain
    const result = await serverContractService.updateTrendIndexOnChain({
      newsAccountAddress,
      trendScore: trendScore * 1000, // Scale to u64 (0-100000)
      factorsHash
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update trend index on-chain" },
        { status: 500 }
      );
    }

    // Calculate trend velocity if we have history
    let trendVelocity = 0;
    if (token.trendHistory.length > 0) {
      const previousScore = token.trendHistory[0].score;
      const previousTimestamp = token.trendHistory[0].timestamp;
      const timeDiffMinutes = (trendResult.timestamp.getTime() - previousTimestamp.getTime()) / (1000 * 60);
      if (timeDiffMinutes > 0) {
        trendVelocity = (trendScore - previousScore) / timeDiffMinutes;
      }
    }

    // Update database with AI-computed values
    await prisma.token.update({
      where: { id: tokenId },
      data: {
        trendIndexScore: trendScore,
        lastTrendUpdate: trendResult.timestamp,
        trendVelocity: trendVelocity,
        sentimentScore: trendResult.factors.sentiment,
        mentionVelocity: trendResult.factors.socialActivity,
        holderMomentum: trendResult.factors.holderMomentum,
        crossMarketCorr: trendResult.factors.crossMarketCorr,
        trendFactorWeights: trendResult.weights
      }
    });

    // Create history record
    await prisma.trendIndexHistory.create({
      data: {
        tokenId,
        score: trendScore,
        factors: trendResult.factors,
        weights: trendResult.weights,
        timestamp: trendResult.timestamp
      }
    });

    return NextResponse.json({
      success: true,
      signature: result.signature,
      trendScore: trendScore,
      message: "Trend index updated successfully using AI",
      confidence: trendResult.confidence,
      reasoning: trendResult.reasoning
    });

  } catch (error) {
    console.error("Error updating trend index:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
