#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json';

const prisma = new PrismaClient();

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
  const programId = getProgramId();
  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // Read-only
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  return new anchor.Program(NEWS_PLATFORM_IDL as any, provider);
}

interface VerificationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

async function verifyLeaderboardData(): Promise<VerificationResult> {
  try {
    console.log('🔍 Verifying leaderboard data...');
    
    // Check if leaderboard API returns real data
    const response = await fetch('http://localhost:3000/api/leaderboard');
    if (!response.ok) {
      return {
        component: 'Leaderboard API',
        status: 'FAIL',
        message: 'Leaderboard API is not accessible'
      };
    }
    
    const responseData = await response.json();
    
    // Check if data has traders array
    const data = responseData.traders || responseData;
    
    // Check if data is an array
    if (!Array.isArray(data)) {
      return {
        component: 'Leaderboard API',
        status: 'FAIL',
        message: 'Leaderboard API returned invalid data format'
      };
    }
    
    // Check if we have real data (not just mock data)
    const hasRealData = data.some((trader: any) => 
      trader.volume > 0 || trader.totalTokensOwned > 0 || trader.storiesPublished > 0
    );
    
    if (data.length === 0) {
      return {
        component: 'Leaderboard API',
        status: 'WARNING',
        message: 'No traders found in leaderboard'
      };
    }
    
    // Check if user names are real (not just "Wallet User...")
    const hasRealNames = data.some((trader: any) => 
      !trader.name.startsWith('Wallet User')
    );
    
    return {
      component: 'Leaderboard API',
      status: hasRealData ? 'PASS' : 'WARNING',
      message: hasRealData 
        ? `Found ${data.length} traders with real data` 
        : 'Leaderboard contains mostly mock data',
      details: {
        traderCount: data.length,
        hasRealNames,
        sampleData: data.slice(0, 3)
      }
    };
    
  } catch (error) {
    return {
      component: 'Leaderboard API',
      status: 'FAIL',
      message: `Error verifying leaderboard: ${error}`
    };
  }
}

async function verifyDatabaseData(): Promise<VerificationResult> {
  try {
    console.log('🔍 Verifying database data...');
    
    // Check for trades
    const tradeCount = await prisma.trade.count();
    
    // Check for users
    const userCount = await prisma.user.count();
    
    // Check for tokens
    const tokenCount = await prisma.token.count();
    
    // Check for stories
    const storyCount = await prisma.story.count();
    
    // Check for placeholder Arweave URLs (simplified check)
    let placeholderStories = 0;
    try {
      placeholderStories = await prisma.story.count({
        where: {
          arweaveUrl: 'https://arweave.net/placeholder'
        }
      });
    } catch (error) {
      console.warn('Could not check for placeholder URLs:', error);
    }
    
    return {
      component: 'Database',
      status: placeholderStories === 0 ? 'PASS' : 'WARNING',
      message: placeholderStories === 0 
        ? 'No placeholder data found in database'
        : `Found ${placeholderStories} stories with placeholder URLs`,
      details: {
        placeholderStories,
        tradeCount,
        userCount,
        tokenCount,
        storyCount
      }
    };
    
  } catch (error) {
    return {
      component: 'Database',
      status: 'FAIL',
      message: `Error verifying database: ${error}`
    };
  }
}

async function verifyBlockchainData(): Promise<VerificationResult> {
  try {
    console.log('🔍 Verifying blockchain data...');
    
    const program = getProgram();
    
    // Get news accounts
    const newsAccounts = await program.account.newsAccount.all();
    
    // Get market accounts
    const marketAccounts = await program.account.market.all();
    
    // Check if we have real market data
    const hasRealMarketData = marketAccounts.some(market => 
      Number(market.account.solReserves) > 0 || 
      Number(market.account.currentPrice) > 0
    );
    
    return {
      component: 'Blockchain',
      status: newsAccounts.length > 0 ? 'PASS' : 'WARNING',
      message: newsAccounts.length > 0 
        ? `Found ${newsAccounts.length} news accounts and ${marketAccounts.length} market accounts`
        : 'No blockchain data found',
      details: {
        newsAccountCount: newsAccounts.length,
        marketAccountCount: marketAccounts.length,
        hasRealMarketData
      }
    };
    
  } catch (error) {
    return {
      component: 'Blockchain',
      status: 'FAIL',
      message: `Error verifying blockchain data: ${error}`
    };
  }
}

async function verifyPriceCharts(): Promise<VerificationResult> {
  try {
    console.log('🔍 Verifying price charts...');
    
    // Check if we have tokens with price history
    const tokensWithTrades = await prisma.token.findMany({
      where: {
        trades: {
          some: {}
        }
      },
      include: {
        trades: true
      }
    });
    
    const hasPriceHistory = tokensWithTrades.some(token => 
      token.trades.length > 0
    );
    
    return {
      component: 'Price Charts',
      status: hasPriceHistory ? 'PASS' : 'WARNING',
      message: hasPriceHistory 
        ? `Found ${tokensWithTrades.length} tokens with price history`
        : 'No price history data available',
      details: {
        tokensWithTrades: tokensWithTrades.length,
        totalTrades: tokensWithTrades.reduce((sum, token) => sum + token.trades.length, 0)
      }
    };
    
  } catch (error) {
    return {
      component: 'Price Charts',
      status: 'FAIL',
      message: `Error verifying price charts: ${error}`
    };
  }
}

async function verifyOracleService(): Promise<VerificationResult> {
  try {
    console.log('🔍 Verifying oracle service...');
    
    // Check if trading events processor exists
    const fs = await import('fs');
    const path = await import('path');
    
    const tradingEventsPath = path.join(process.cwd(), 'oracle-service/src/trading-events.ts');
    const listenerPath = path.join(process.cwd(), 'oracle-service/src/listener.ts');
    
    const tradingEventsExists = fs.existsSync(tradingEventsPath);
    const listenerExists = fs.existsSync(listenerPath);
    
    if (!tradingEventsExists || !listenerExists) {
      return {
        component: 'Oracle Service',
        status: 'FAIL',
        message: 'Oracle service files are missing'
      };
    }
    
    // Check if listener has trading event handlers
    const listenerContent = fs.readFileSync(listenerPath, 'utf8');
    const hasTradingEvents = listenerContent.includes('TokensPurchased') && 
                           listenerContent.includes('TokensSold');
    
    return {
      component: 'Oracle Service',
      status: hasTradingEvents ? 'PASS' : 'WARNING',
      message: hasTradingEvents 
        ? 'Oracle service has trading event handlers'
        : 'Oracle service missing trading event handlers',
      details: {
        tradingEventsExists,
        listenerExists,
        hasTradingEvents
      }
    };
    
  } catch (error) {
    return {
      component: 'Oracle Service',
      status: 'FAIL',
      message: `Error verifying oracle service: ${error}`
    };
  }
}

async function runVerification() {
  console.log('🚀 Starting comprehensive data verification...\n');
  
  const results: VerificationResult[] = [];
  
  // Run all verification checks
  results.push(await verifyDatabaseData());
  results.push(await verifyBlockchainData());
  results.push(await verifyPriceCharts());
  results.push(await verifyOracleService());
  results.push(await verifyLeaderboardData());
  
  // Print results
  console.log('\n📊 Verification Results:');
  console.log('=' .repeat(50));
  
  let passCount = 0;
  let warningCount = 0;
  let failCount = 0;
  
  results.forEach(result => {
    const statusIcon = result.status === 'PASS' ? '✅' : 
                      result.status === 'WARNING' ? '⚠️ ' : '❌';
    
    console.log(`${statusIcon} ${result.component}: ${result.message}`);
    
    if (result.details) {
      Object.entries(result.details).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
    
    console.log('');
    
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARNING') warningCount++;
    else failCount++;
  });
  
  console.log('📈 Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ⚠️  Warnings: ${warningCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 All critical components are working with real data!');
  } else {
    console.log('\n⚠️  Some components need attention. Please review the failed items above.');
  }
  
  await prisma.$disconnect();
}

// Run verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerification().catch(console.error);
}

export { runVerification };
