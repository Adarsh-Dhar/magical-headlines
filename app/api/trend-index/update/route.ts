import { NextRequest, NextResponse } from "next/server";
import { serverContractService } from "@/lib/server-contract-service";
import { prisma } from "@/lib/prisma";

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

    // Generate a mock trend score for testing
    // In production, this would call the AI trend calculator
    const mockTrendScore = Math.random() * 100;
    const mockFactorsHash = Buffer.from(JSON.stringify({
      sentiment: Math.random() * 2 - 1,
      tradingVelocity: Math.random() * 10,
      volumeSpike: Math.random() * 2 - 1,
      priceMomentum: Math.random() * 0.2 - 0.1,
      socialActivity: Math.random() * 50,
      holderMomentum: Math.random() * 20,
      crossMarketCorr: Math.random() * 2 - 1
    })).toString('hex').substring(0, 64);

    // Update on-chain
    const result = await serverContractService.updateTrendIndexOnChain({
      newsAccountAddress,
      trendScore: mockTrendScore,
      factorsHash: mockFactorsHash
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update trend index" },
        { status: 500 }
      );
    }

    // Update database
    await prisma.token.update({
      where: { id: tokenId },
      data: {
        trendIndexScore: mockTrendScore,
        lastTrendUpdate: new Date(),
        trendFactorWeights: {
          sentiment: 0.25,
          tradingVelocity: 0.20,
          volumeSpike: 0.20,
          priceMomentum: 0.15,
          socialActivity: 0.10,
          holderMomentum: 0.05,
          crossMarketCorr: 0.05
        }
      }
    });

    // Create history record
    await prisma.trendIndexHistory.create({
      data: {
        tokenId,
        score: mockTrendScore,
        factors: {
          sentiment: Math.random() * 2 - 1,
          tradingVelocity: Math.random() * 10,
          volumeSpike: Math.random() * 2 - 1,
          priceMomentum: Math.random() * 0.2 - 0.1,
          socialActivity: Math.random() * 50,
          holderMomentum: Math.random() * 20,
          crossMarketCorr: Math.random() * 2 - 1
        },
        weights: {
          sentiment: 0.25,
          tradingVelocity: 0.20,
          volumeSpike: 0.20,
          priceMomentum: 0.15,
          socialActivity: 0.10,
          holderMomentum: 0.05,
          crossMarketCorr: 0.05
        },
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      signature: result.signature,
      trendScore: mockTrendScore,
      message: "Trend index updated successfully"
    });

  } catch (error) {
    console.error("Error updating trend index:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
