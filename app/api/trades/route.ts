import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    const tokenId = searchParams.get('tokenId');
    const type = searchParams.get('type') as 'BUY' | 'SELL' | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate required parameters - either userAddress OR tokenId must be provided
    if (!userAddress && !tokenId) {
      return NextResponse.json(
        { error: 'Either userAddress or tokenId parameter is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {};

    if (userAddress) {
      where.trader = {
        walletAddress: userAddress
      };
    }

    if (tokenId) {
      where.tokenId = tokenId;
    }

    if (type && (type === 'BUY' || type === 'SELL')) {
      where.type = type;
    }

    // Get total count for pagination
    const totalCount = await prisma.trade.count({ where });

    // Fetch trades with pagination
    const trades = await prisma.trade.findMany({
      where,
      include: {
        token: {
          include: {
            story: {
              select: {
                headline: true,
                authorAddress: true
              }
            }
          }
        },
        trader: {
          select: {
            walletAddress: true,
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Calculate pagination info
    const hasMore = offset + limit < totalCount;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);

    // Transform data for API response
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      type: trade.type,
      amount: trade.amount,
      priceAtTrade: trade.priceAtTrade,
      costInSol: trade.costInSol,
      signature: trade.signature,
      timestamp: trade.timestamp,
      token: {
        id: trade.token.id,
        headline: trade.token.story.headline,
        authorAddress: trade.token.story.authorAddress,
        mintAccount: trade.token.mintAccount
      },
      trader: {
        walletAddress: trade.trader.walletAddress,
        name: trade.trader.name
      }
    }));

    return NextResponse.json({
      trades: transformedTrades,
      pagination: {
        totalCount,
        currentPage,
        totalPages,
        hasMore,
        limit,
        offset
      }
    });

  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, priceAtTrade, costInSol, signature, tokenId, traderWalletAddress } = body;

    // Validate required fields
    if (!type || !amount || !priceAtTrade || !costInSol || !tokenId || !traderWalletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate trade type
    if (type !== 'BUY' && type !== 'SELL') {
      return NextResponse.json(
        { error: 'Invalid trade type' },
        { status: 400 }
      );
    }

    // Create or update user
    const user = await prisma.user.upsert({
      where: { walletAddress: traderWalletAddress },
      update: {},
      create: {
        walletAddress: traderWalletAddress,
        name: null
      }
    });

    // Create trade record
    const trade = await prisma.trade.create({
      data: {
        type,
        amount: parseFloat(amount),
        priceAtTrade: parseFloat(priceAtTrade),
        costInSol: parseFloat(costInSol),
        signature: signature || null,
        traderId: user.id,
        tokenId
      },
      include: {
        token: {
          include: {
            story: {
              select: {
                headline: true,
                authorAddress: true
              }
            }
          }
        },
        trader: {
          select: {
            walletAddress: true,
            name: true
          }
        }
      }
    });

    // IMPORTANT: Update volume24h for the token
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const allTrades = await prisma.trade.findMany({
        where: {
          tokenId,
          timestamp: { gte: oneDayAgo }
        }
      });

      if (allTrades.length > 0) {
        // Calculate 24h volume
        const volume24h = allTrades.reduce((sum, t) => sum + (t.amount * t.priceAtTrade), 0);
        
        // Calculate price change
        const currentPrice = allTrades[0].priceAtTrade;
        const oldestPrice = allTrades[allTrades.length - 1].priceAtTrade;
        const priceChange24h = oldestPrice > 0 ? ((currentPrice - oldestPrice) / oldestPrice) * 100 : 0;

        // Update token statistics
        await prisma.token.update({
          where: { id: tokenId },
          data: {
            price: currentPrice,
            priceChange24h,
            volume24h,
          }
        });
      }
    } catch (updateError) {
      console.error('Error updating volume24h:', updateError);
      // Don't fail the trade creation if volume update fails
    }

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json(
      { error: 'Failed to create trade' },
      { status: 500 }
    );
  }
}