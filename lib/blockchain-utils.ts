import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json';

// Get connection and program
function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID || "9pRU9UFJctN6H1b1hY3GCkVwK5b3ESC7ZqBDZ8thooN4";
  return new PublicKey(id);
}

function getProgram() {
  const connection = getConnection();
  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // Read-only
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  return new anchor.Program(NEWS_PLATFORM_IDL as any, provider);
}

export interface MarketAccountData {
  currentPrice: number;
  solReserves: number;
  currentSupply: number;
  totalVolume: number;
  curveType: number;
  isDelegated: boolean;
  delegationStatus: any;
}

export interface NewsAccountData {
  authority: string;
  headline: string;
  arweaveLink: string;
  summaryLink: string;
  nonce: number;
}

export interface TradingEvent {
  type: 'purchased' | 'sold';
  trader: string;
  amount: number;
  price: number;
  totalValue: number;
  newSupply: number;
  timestamp: Date;
  signature: string;
}

/**
 * Fetch market account data from blockchain
 */
export async function fetchMarketAccount(address: string): Promise<MarketAccountData | null> {
  try {
    const program = getProgram();
    const marketPubkey = new PublicKey(address);
    
    const marketAccount = await program.account.market.fetch(marketPubkey);
    
    return {
      currentPrice: Number(marketAccount.currentPrice) / 1e9,
      solReserves: Number(marketAccount.solReserves) / 1e9,
      currentSupply: Number(marketAccount.currentSupply),
      totalVolume: Number(marketAccount.totalVolume) / 1e9,
      curveType: Number(marketAccount.curveType),
      isDelegated: marketAccount.isDelegated,
      delegationStatus: marketAccount.delegationStatus
    };
  } catch (error) {
    console.error('Error fetching market account:', error);
    return null;
  }
}

/**
 * Fetch news account data from blockchain
 */
export async function fetchNewsAccount(address: string): Promise<NewsAccountData | null> {
  try {
    const program = getProgram();
    const newsPubkey = new PublicKey(address);
    
    const newsAccount = await program.account.newsAccount.fetch(newsPubkey);
    
    return {
      authority: newsAccount.authority.toString(),
      headline: newsAccount.headline,
      arweaveLink: newsAccount.arweaveLink,
      summaryLink: newsAccount.summaryLink,
      nonce: Number(newsAccount.nonce)
    };
  } catch (error) {
    console.error('Error fetching news account:', error);
    return null;
  }
}

/**
 * Parse trading events from a transaction signature
 */
export async function parseTransactionEvents(signature: string): Promise<TradingEvent[]> {
  try {
    const connection = getConnection();
    const program = getProgram();
    
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
    
    if (!transaction) {
      return [];
    }
    
    const events: TradingEvent[] = [];
    
    // Parse logs for TokensPurchased and TokensSold events
    const logs = transaction.meta?.logMessages || [];
    
    for (const log of logs) {
      if (log.includes('Program log: TokensPurchased')) {
        // Parse TokensPurchased event
        const eventData = parseTokensPurchasedLog(log);
        if (eventData) {
          events.push({
            type: 'purchased',
            trader: eventData.buyer,
            amount: eventData.amount,
            price: eventData.cost / eventData.amount,
            totalValue: eventData.cost,
            newSupply: eventData.newSupply,
            timestamp: new Date(transaction.blockTime ? transaction.blockTime * 1000 : Date.now()),
            signature
          });
        }
      } else if (log.includes('Program log: TokensSold')) {
        // Parse TokensSold event
        const eventData = parseTokensSoldLog(log);
        if (eventData) {
          events.push({
            type: 'sold',
            trader: eventData.seller,
            amount: eventData.amount,
            price: eventData.refund / eventData.amount,
            totalValue: eventData.refund,
            newSupply: eventData.newSupply,
            timestamp: new Date(transaction.blockTime ? transaction.blockTime * 1000 : Date.now()),
            signature
          });
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error parsing transaction events:', error);
    return [];
  }
}

/**
 * Parse TokensPurchased event from log
 */
function parseTokensPurchasedLog(log: string): { buyer: string; amount: number; cost: number; newSupply: number } | null {
  try {
    // Extract data from log message
    // Format: "Program log: TokensPurchased { buyer: ..., amount: ..., cost: ..., newSupply: ... }"
    const match = log.match(/TokensPurchased.*?buyer:\s*([A-Za-z0-9]+).*?amount:\s*(\d+).*?cost:\s*(\d+).*?newSupply:\s*(\d+)/);
    
    if (match) {
      return {
        buyer: match[1],
        amount: parseInt(match[2]),
        cost: parseInt(match[3]),
        newSupply: parseInt(match[4])
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing TokensPurchased log:', error);
    return null;
  }
}

/**
 * Parse TokensSold event from log
 */
function parseTokensSoldLog(log: string): { seller: string; amount: number; refund: number; newSupply: number } | null {
  try {
    // Extract data from log message
    // Format: "Program log: TokensSold { seller: ..., amount: ..., refund: ..., newSupply: ... }"
    const match = log.match(/TokensSold.*?seller:\s*([A-Za-z0-9]+).*?amount:\s*(\d+).*?refund:\s*(\d+).*?newSupply:\s*(\d+)/);
    
    if (match) {
      return {
        seller: match[1],
        amount: parseInt(match[2]),
        refund: parseInt(match[3]),
        newSupply: parseInt(match[4])
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing TokensSold log:', error);
    return null;
  }
}

/**
 * Generate estimated price history using bonding curve
 */
export function estimatePriceHistory(currentPrice: number, timeframe: string): Array<{ timestamp: string; price: number; volume: number; type: string }> {
  const now = new Date();
  const points: Array<{ timestamp: string; price: number; volume: number; type: string }> = [];
  
  // Calculate time range
  let hoursBack: number;
  switch (timeframe) {
    case '1h':
      hoursBack = 1;
      break;
    case '24h':
      hoursBack = 24;
      break;
    case '7d':
      hoursBack = 24 * 7;
      break;
    case '30d':
      hoursBack = 24 * 30;
      break;
    default:
      hoursBack = 24;
  }
  
  // Generate points using bonding curve estimation
  // Assuming initial price of 0.001 SOL and current price
  const initialPrice = 0.001;
  const priceRatio = currentPrice / initialPrice;
  
  // Generate 10-20 points depending on timeframe
  const numPoints = Math.min(20, Math.max(10, Math.floor(hoursBack / 2)));
  
  for (let i = 0; i < numPoints; i++) {
    const timeOffset = (hoursBack * 60 * 60 * 1000 * i) / (numPoints - 1);
    const timestamp = new Date(now.getTime() - timeOffset);
    
    // Estimate price using exponential growth model
    const progress = i / (numPoints - 1);
    const estimatedPrice = initialPrice * Math.pow(priceRatio, progress);
    
    // Add some realistic volatility
    const volatility = 0.1; // 10% volatility
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const finalPrice = Math.max(0.0001, estimatedPrice * randomFactor);
    
    // Estimate volume (higher volume when price changes more)
    const volume = Math.random() * 0.1 * (1 + Math.abs(progress - 0.5));
    
    points.push({
      timestamp: timestamp.toISOString(),
      price: finalPrice,
      volume,
      type: i === numPoints - 1 ? 'current' : 'estimated'
    });
  }
  
  return points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get transaction signatures for a market account
 */
export async function getMarketTransactionSignatures(marketAddress: string, limit: number = 100): Promise<string[]> {
  try {
    const connection = getConnection();
    const marketPubkey = new PublicKey(marketAddress);
    
    const signatures = await connection.getSignaturesForAddress(marketPubkey, { limit });
    return signatures.map(sig => sig.signature);
  } catch (error) {
    console.error('Error fetching transaction signatures:', error);
    return [];
  }
}

/**
 * Find token by market account using PDA derivation
 */
export async function findTokenByMarketAccount(marketAddress: string): Promise<{ newsAccount: string; tokenId?: string } | null> {
  try {
    const program = getProgram();
    const marketPubkey = new PublicKey(marketAddress);
    
    // Fetch market account to get news account
    const marketAccount = await program.account.market.fetch(marketPubkey);
    const newsAccount = marketAccount.newsAccount.toString();
    
    // Try to find corresponding token in database
    const { prisma } = await import('./prisma');
    const token = await prisma.token.findFirst({
      where: {
        story: {
          id: newsAccount
        }
      },
      select: {
        id: true
      }
    });
    
    return {
      newsAccount,
      tokenId: token?.id
    };
  } catch (error) {
    console.error('Error finding token by market account:', error);
    return null;
  }
}
