import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMarketAccount } from "@/lib/blockchain-utils";
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Helper function to get user's token balance from blockchain
async function getUserTokenBalance(userAddress: string, mintAddress: string): Promise<number> {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"
    );
    
    const userPubkey = new PublicKey(userAddress);
    const mintPubkey = new PublicKey(mintAddress);
    
    // Get all token accounts for the user
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      userPubkey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    // Find the token account for this specific mint
    const userTokenAccount = tokenAccounts.value.find(account => 
      account.account.data.parsed.info.mint === mintAddress
    );
    
    if (!userTokenAccount) {
      return 0;
    }
    
    // Get the token amount and decimals
    const tokenAmount = userTokenAccount.account.data.parsed.info.tokenAmount;
    const decimals = tokenAmount.decimals;
    const rawAmount = Number(tokenAmount.amount);
    
    // Convert to actual token amount
    return rawAmount / Math.pow(10, decimals);
  } catch (error) {
    return 0;
  }
}

// GET /api/tokens/[id] - Get single token details with current market data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tokenId } = await params;
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");
    
    // Build trades query with optional user filtering
    const tradesQuery: any = {
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        id: true,
        type: true,
        amount: true,
        priceAtTrade: true,
        timestamp: true,
        trader: {
          select: {
            walletAddress: true,
            name: true
          }
        }
      }
    };

    // If userAddress is provided, filter trades by user and get all trades (not just 10)
    if (userAddress) {
      tradesQuery.where = {
        trader: {
          walletAddress: userAddress
        }
      };
      // Get all user trades, not just recent 10
    } else {
      tradesQuery.take = 10; // Default behavior for all trades
    }

    // Fetch token from database
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: { 
        story: {
          select: {
            id: true,
            headline: true,
            authorAddress: true,
            createdAt: true,
            arweaveUrl: true,
            arweaveId: true
          }
        },
        trades: tradesQuery
      }
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Fetch current blockchain data
    let marketData = null;
    if (token.marketAccount) {
      try {
        marketData = await fetchMarketAccount(token.marketAccount);
      } catch (error) {
        // Continue without blockchain data
      }
    }

    // Calculate additional statistics
    const totalTrades = await prisma.trade.count({
      where: { tokenId }
    });

    const volume24h = await prisma.trade.aggregate({
      where: {
        tokenId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _sum: {
        amount: true
      }
    });

    // Calculate price change from first trade to current
    let priceChange24h = 0;
    if (token.trades.length > 0) {
      const firstTrade = token.trades[token.trades.length - 1]; // Oldest trade
      const currentPrice = marketData?.currentPrice || token.price;
      if (firstTrade.priceAtTrade > 0) {
        priceChange24h = ((currentPrice - firstTrade.priceAtTrade) / firstTrade.priceAtTrade) * 100;
      }
    }

    // Calculate user-specific data if userAddress is provided
    let userSpecificData = null;
    if (userAddress && token.mintAccount) {
      try {
        // Get user's current blockchain holdings
        const currentHoldings = await getUserTokenBalance(userAddress, token.mintAccount);
        
        // Calculate user statistics from database trades
        const userTrades = token.trades;
        const buyTrades = userTrades.filter(trade => trade.type === 'BUY');
        const sellTrades = userTrades.filter(trade => trade.type === 'SELL');
        
        const totalPurchases = buyTrades.reduce((sum, trade) => sum + trade.amount, 0);
        const totalSales = sellTrades.reduce((sum, trade) => sum + trade.amount, 0);
        const totalPurchaseValue = buyTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
        const totalSaleValue = sellTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
        
        const averagePurchasePrice = totalPurchases > 0 ? totalPurchaseValue / totalPurchases : 0;
        const databaseHoldings = totalPurchases - totalSales;
        
        // Calculate profit/loss
        const currentPrice = marketData?.currentPrice || token.price;
        const currentValue = currentHoldings * currentPrice;
        const totalInvested = totalPurchaseValue - totalSaleValue;
        const profitLoss = currentValue - totalInvested;
        
        userSpecificData = {
          totalPurchases,
          totalSales,
          averagePurchasePrice,
          currentHoldings, // from blockchain
          databaseHoldings, // from database trades
          profitLoss,
          totalInvested,
          currentValue,
          trades: userTrades // All user trades with full details
        };
      } catch (error) {
        userSpecificData = {
          error: 'Failed to calculate user data'
        };
      }
    }

    // Return combined data
    const response: any = {
      id: token.id,
      marketAccount: token.marketAccount,
      mintAccount: token.mintAccount,
      price: marketData?.currentPrice || token.price,
      priceChange24h: marketData ? (marketData.currentPrice - token.price) / token.price * 100 : priceChange24h,
      volume24h: marketData?.totalVolume || token.volume24h || 0,
      marketCap: marketData ? marketData.currentPrice * 100 : token.marketCap, // Assuming 100 total supply
      currentSupply: marketData?.currentSupply || 100,
      solReserves: marketData?.solReserves || 0,
      totalTrades,
      isDelegated: marketData?.isDelegated || false,
      curveType: marketData?.curveType || 0,
      story: token.story,
      recentTrades: token.trades,
      lastUpdated: new Date().toISOString(),
      blockchainData: marketData ? {
        currentPrice: marketData.currentPrice,
        solReserves: marketData.solReserves,
        currentSupply: marketData.currentSupply,
        totalVolume: marketData.totalVolume,
        isDelegated: marketData.isDelegated
      } : null
    };

    // Add user-specific data if userAddress was provided
    if (userSpecificData) {
      response.userSpecificData = userSpecificData;
    }

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch token details" },
      { status: 500 }
    );
  }
}
