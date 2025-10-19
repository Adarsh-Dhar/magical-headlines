import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { parseTokensPurchasedEvent, parseTokensSoldEvent, TradingEventData } from './types/events';

const prisma = new PrismaClient();

export async function processTokensPurchasedEvent(event: any, signature: string) {
  try {
    const eventData = parseTokensPurchasedEvent(event);
    console.log('Processing TokensPurchased event:', eventData);

    // Find the token by looking up the market account
    // We need to find which token this trade belongs to
    const token = await findTokenByMarketAccount(eventData);
    
    if (!token) {
      console.log('Token not found for purchase event, skipping...');
      return;
    }

    // Create or update user
    await createOrUpdateUser(eventData.buyer);

    // Create trade record
    const trade = await prisma.trade.create({
      data: {
        type: 'BUY',
        amount: eventData.amount,
        priceAtTrade: eventData.cost / eventData.amount, // Price per token
        trader: {
          connect: { walletAddress: eventData.buyer }
        },
        token: {
          connect: { id: token.id }
        },
        timestamp: new Date()
      }
    });

    // Update token statistics
    await updateTokenStatistics(token.id);

    console.log('Successfully processed TokensPurchased event:', trade.id);
  } catch (error) {
    console.error('Error processing TokensPurchased event:', error);
  }
}

export async function processTokensSoldEvent(event: any, signature: string) {
  try {
    const eventData = parseTokensSoldEvent(event);
    console.log('Processing TokensSold event:', eventData);

    // Find the token by looking up the market account
    const token = await findTokenByMarketAccount(eventData);
    
    if (!token) {
      console.log('Token not found for sell event, skipping...');
      return;
    }

    // Create or update user
    await createOrUpdateUser(eventData.seller);

    // Create trade record
    const trade = await prisma.trade.create({
      data: {
        type: 'SELL',
        amount: eventData.amount,
        priceAtTrade: eventData.refund / eventData.amount, // Price per token
        trader: {
          connect: { walletAddress: eventData.seller }
        },
        token: {
          connect: { id: token.id }
        },
        timestamp: new Date()
      }
    });

    // Update token statistics
    await updateTokenStatistics(token.id);

    console.log('Successfully processed TokensSold event:', trade.id);
  } catch (error) {
    console.error('Error processing TokensSold event:', error);
  }
}

async function createOrUpdateUser(walletAddress: string) {
  try {
    await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: {
        walletAddress,
        name: null // Will be set by user later
      }
    });
  } catch (error) {
    console.error('Error creating/updating user:', error);
  }
}

async function findTokenByMarketAccount(eventData: any) {
  // This is a simplified approach - in a real implementation,
  // you'd need to map the market account to the token
  // For now, we'll try to find tokens that might be related
  
  try {
    // Get all tokens and try to match by checking if the market account exists
    const tokens = await prisma.token.findMany({
      include: {
        story: true
      }
    });

    // This is a placeholder - you'd need to implement proper mapping
    // based on your contract's PDA structure
    return tokens[0] || null;
  } catch (error) {
    console.error('Error finding token by market account:', error);
    return null;
  }
}

async function updateTokenStatistics(tokenId: string) {
  try {
    // Get all trades for this token in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const trades = await prisma.trade.findMany({
      where: {
        tokenId,
        timestamp: {
          gte: oneDayAgo
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    if (trades.length === 0) return;

    // Calculate 24h volume
    const volume24h = trades.reduce((sum, trade) => {
      return sum + (trade.amount * trade.priceAtTrade);
    }, 0);

    // Calculate price change
    const currentPrice = trades[0].priceAtTrade;
    const oldestPrice = trades[trades.length - 1].priceAtTrade;
    const priceChange24h = oldestPrice > 0 ? ((currentPrice - oldestPrice) / oldestPrice) * 100 : 0;

    // Update token
    await prisma.token.update({
      where: { id: tokenId },
      data: {
        price: currentPrice,
        priceChange24h,
        volume24h,
        marketCap: currentPrice * 100 // Assuming 100 total supply
      }
    });

    console.log(`Updated token ${tokenId} statistics:`, {
      price: currentPrice,
      priceChange24h,
      volume24h
    });
  } catch (error) {
    console.error('Error updating token statistics:', error);
  }
}
