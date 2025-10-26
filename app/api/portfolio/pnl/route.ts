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

// POST /api/portfolio/pnl - Get bulk P&L data for multiple tokens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, tokenIds } = body;

    if (!userAddress) {
      return NextResponse.json(
        { error: "userAddress is required" },
        { status: 400 }
      );
    }

    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json(
        { error: "tokenIds array is required" },
        { status: 400 }
      );
    }

    // Fetch all tokens with their trades
    const tokens = await prisma.token.findMany({
      where: {
        id: {
          in: tokenIds
        }
      },
      include: {
        story: {
          select: {
            id: true,
            headline: true,
            authorAddress: true
          }
        },
        trades: {
          where: {
            trader: {
              walletAddress: userAddress
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          select: {
            id: true,
            type: true,
            amount: true,
            priceAtTrade: true,
            costInSol: true,
            timestamp: true
          }
        }
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json({
        tokens: [],
        totals: {
          totalPnL: 0,
          totalRealizedPnL: 0,
          totalUnrealizedPnL: 0,
          totalInvested: 0,
          totalCurrentValue: 0,
          totalReturnPercentage: 0,
          totalTrades: 0,
          profitableTokens: 0,
          winRate: 0
        }
      });
    }

    // Process each token's P&L data
    const tokenPnLData = await Promise.all(
      tokens.map(async (token) => {
        try {
          // Get user's current blockchain holdings
          const currentHoldings = token.mintAccount 
            ? await getUserTokenBalance(userAddress, token.mintAccount)
            : 0;
          
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
          
          // Get current price from market data or token price
          let currentPrice = token.price;
          if (token.marketAccount) {
            try {
              const marketData = await fetchMarketAccount(token.marketAccount);
              if (marketData?.currentPrice) {
                currentPrice = marketData.currentPrice;
              }
            } catch (error) {
              // Use token.price as fallback
            }
          }
          
          // Calculate profit/loss
          const currentValue = currentHoldings * currentPrice;
          const totalInvested = totalPurchaseValue - totalSaleValue;
          const profitLoss = currentValue - totalInvested;
          
          return {
            tokenId: token.id,
            tokenName: token.story.headline,
            totalPurchases,
            totalSales,
            averagePurchasePrice,
            currentHoldings,
            databaseHoldings,
            profitLoss,
            totalInvested,
            currentValue,
            currentPrice,
            trades: userTrades
          };
        } catch (error) {
          console.error(`Error processing token ${token.id}:`, error);
          return {
            tokenId: token.id,
            tokenName: token.story.headline,
            totalPurchases: 0,
            totalSales: 0,
            averagePurchasePrice: 0,
            currentHoldings: 0,
            databaseHoldings: 0,
            profitLoss: 0,
            totalInvested: 0,
            currentValue: 0,
            currentPrice: token.price,
            trades: []
          };
        }
      })
    );

    // Calculate aggregate totals
    const totalPnL = tokenPnLData.reduce((sum, token) => sum + token.profitLoss, 0);
    const totalInvested = tokenPnLData.reduce((sum, token) => sum + token.totalInvested, 0);
    const totalCurrentValue = tokenPnLData.reduce((sum, token) => sum + token.currentValue, 0);
    const totalReturnPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Calculate realized vs unrealized P&L
    const totalRealizedPnL = tokenPnLData.reduce((sum, token) => {
      const buyTrades = token.trades.filter(trade => trade.type === 'BUY');
      const sellTrades = token.trades.filter(trade => trade.type === 'SELL');
      const totalBuyValue = buyTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
      const totalSellValue = sellTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
      return sum + (totalSellValue - totalBuyValue);
    }, 0);

    const totalUnrealizedPnL = totalPnL - totalRealizedPnL;

    // Performance metrics
    const totalTrades = tokenPnLData.reduce((sum, token) => sum + token.trades.length, 0);
    const profitableTokens = tokenPnLData.filter(token => token.profitLoss > 0).length;
    const winRate = tokenPnLData.length > 0 ? (profitableTokens / tokenPnLData.length) * 100 : 0;

    return NextResponse.json({
      tokens: tokenPnLData,
      totals: {
        totalPnL,
        totalRealizedPnL,
        totalUnrealizedPnL,
        totalInvested,
        totalCurrentValue,
        totalReturnPercentage,
        totalTrades,
        profitableTokens,
        winRate
      }
    });

  } catch (error) {
    console.error("Error fetching portfolio P&L data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
