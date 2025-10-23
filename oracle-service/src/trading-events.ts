import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { parseTokensPurchasedEvent, parseTokensSoldEvent, parseTokensStakedEvent, parseTokensUnstakedEvent, parseFeesClaimedEvent, TradingEventData } from './types/events';

const prisma = new PrismaClient();

function alignToUtcMinute(date: Date): Date {
  const ms = date.getTime();
  return new Date(Math.floor(ms / 60000) * 60000);
}

async function upsertTokenVolumeMinute(
  tokenId: string,
  timestamp: Date,
  volumeSol: number,
  tradeType: 'BUY' | 'SELL'
) {
  const minute = alignToUtcMinute(timestamp);
  
  console.log(`Upserting volume for token ${tokenId}, minute ${minute.toISOString()}, volume ${volumeSol} SOL, type ${tradeType}`);
  
  const existing = await prisma.tokenVolumeMinute.findUnique({
    where: {
      UniqueTokenMinute: { tokenId, minute }
    }
  });

  if (existing) {
    const updated = await prisma.tokenVolumeMinute.update({
      where: { id: existing.id },
      data: {
        volumeSol: existing.volumeSol + volumeSol,
        tradeCount: existing.tradeCount + 1,
        buyVolumeSol: tradeType === 'BUY' 
          ? existing.buyVolumeSol + volumeSol 
          : existing.buyVolumeSol,
        sellVolumeSol: tradeType === 'SELL' 
          ? existing.sellVolumeSol + volumeSol 
          : existing.sellVolumeSol,
      }
    });
    console.log(`Updated existing volume record: ${updated.volumeSol} SOL total`);
  } else {
    const created = await prisma.tokenVolumeMinute.create({
      data: {
        tokenId,
        minute,
        volumeSol,
        tradeCount: 1,
        buyVolumeSol: tradeType === 'BUY' ? volumeSol : 0,
        sellVolumeSol: tradeType === 'SELL' ? volumeSol : 0,
      }
    });
    console.log(`Created new volume record: ${created.volumeSol} SOL`);
  }
}

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

    // Update minute-level volume
    await upsertTokenVolumeMinute(
      token.id,
      trade.timestamp,
      eventData.cost, // SOL volume for this trade
      'BUY'
    );

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

    // Update minute-level volume
    await upsertTokenVolumeMinute(
      token.id,
      trade.timestamp,
      eventData.refund, // SOL volume for this trade
      'SELL'
    );

    // Update token statistics
    await updateTokenStatistics(token.id);

    console.log('Successfully processed TokensSold event:', trade.id);
  } catch (error) {
    console.error('Error processing TokensSold event:', error);
  }
}

export async function processTokensStakedEvent(event: any, signature: string) {
  try {
    const eventData = parseTokensStakedEvent(event);
    console.log('Processing TokensStaked event:', eventData);

    // Find the token by looking up the market account
    const token = await findTokenByMarketAccount(eventData);
    
    if (!token) {
      console.log('Token not found for staking event, skipping...');
      return;
    }

    // Update token staking data
    await prisma.token.update({
      where: { id: token.id },
      data: {
        stakedTokens: eventData.totalStaked
      }
    });

    console.log('Successfully processed TokensStaked event for token:', token.id);
  } catch (error) {
    console.error('Error processing TokensStaked event:', error);
  }
}

export async function processTokensUnstakedEvent(event: any, signature: string) {
  try {
    const eventData = parseTokensUnstakedEvent(event);
    console.log('Processing TokensUnstaked event:', eventData);

    // Find the token by looking up the market account
    const token = await findTokenByMarketAccount(eventData);
    
    if (!token) {
      console.log('Token not found for unstaking event, skipping...');
      return;
    }

    // Update token staking data
    await prisma.token.update({
      where: { id: token.id },
      data: {
        stakedTokens: eventData.totalStaked
      }
    });

    console.log('Successfully processed TokensUnstaked event for token:', token.id);
  } catch (error) {
    console.error('Error processing TokensUnstaked event:', error);
  }
}

export async function processFeesClaimedEvent(event: any, signature: string) {
  try {
    const eventData = parseFeesClaimedEvent(event);
    console.log('Processing FeesClaimed event:', eventData);

    // Find the token by looking up the market account
    const token = await findTokenByMarketAccount(eventData);
    
    if (!token) {
      console.log('Token not found for fees claimed event, skipping...');
      return;
    }

    // Reset accumulated fees to 0 after claim
    await prisma.token.update({
      where: { id: token.id },
      data: {
        accumulatedFees: 0
      }
    });

    console.log('Successfully processed FeesClaimed event for token:', token.id);
  } catch (error) {
    console.error('Error processing FeesClaimed event:', error);
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
  try {
    // Try to find token by market account if available
    if (eventData.marketAccount) {
      const token = await prisma.token.findUnique({
        where: { marketAccount: eventData.marketAccount },
        include: { story: true }
      });
      if (token) {
        console.log(`Found token by market account: ${token.id}`);
        return token;
      }
    }

    // Fallback: try to find by news account if available
    if (eventData.newsAccount) {
      const token = await prisma.token.findUnique({
        where: { newsAccount: eventData.newsAccount },
        include: { story: true }
      });
      if (token) {
        console.log(`Found token by news account: ${token.id}`);
        return token;
      }
    }

    // Last resort: return first available token (for testing)
    const tokens = await prisma.token.findMany({
      include: { story: true }
    });
    
    if (tokens.length > 0) {
      console.log(`Using fallback token: ${tokens[0].id}`);
      return tokens[0];
    }

    console.log('No tokens found in database');
    return null;
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
