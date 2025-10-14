import { NextRequest, NextResponse } from "next/server";
import { fetchNewsAccount } from "@/lib/fetch-news-account";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "News account address is required" },
        { status: 400 }
      );
    }

    const newsAccountData = await fetchNewsAccount(address);
    
    if (!newsAccountData) {
      return NextResponse.json(
        { error: "News account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(newsAccountData);
  } catch (error) {
    console.error("Error fetching news account:", error);
    return NextResponse.json(
      { error: "Failed to fetch news account" },
      { status: 500 }
    );
  }
}
