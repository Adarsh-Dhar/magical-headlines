import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    const limit = parseInt(searchParams.get('limit') || '1440')

    // For now, return empty data since we don't have historical price data
    // In a real implementation, you'd fetch this from your price tracking system
    return NextResponse.json({
      data: [],
      timeframe,
      limit,
      message: "Price history data not available yet"
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    )
  }
}