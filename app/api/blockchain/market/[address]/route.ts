import { NextRequest, NextResponse } from "next/server";
import { fetchMarketAccount } from "@/lib/blockchain-utils";

// GET /api/blockchain/market/[address] - Get real-time market data directly from blockchain
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    
    // Validate address format
    if (!address || address.length < 32) {
      return NextResponse.json(
        { error: "Invalid market address" },
        { status: 400 }
      );
    }

    // Fetch market data from blockchain
    const marketData = await fetchMarketAccount(address);
    
    if (!marketData) {
      return NextResponse.json(
        { error: "Market account not found or invalid" },
        { status: 404 }
      );
    }

    // Return real-time blockchain data
    return NextResponse.json({
      address,
      currentPrice: marketData.currentPrice,
      solReserves: marketData.solReserves,
      currentSupply: marketData.currentSupply,
      totalVolume: marketData.totalVolume,
      curveType: marketData.curveType,
      isDelegated: marketData.isDelegated,
      delegationStatus: marketData.delegationStatus,
      lastUpdated: new Date().toISOString(),
      source: "blockchain"
    });

  } catch (error) {
    // console.error("Error fetching market data from blockchain:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data from blockchain" },
      { status: 500 }
    );
  }
}
