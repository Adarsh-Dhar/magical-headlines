import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json';
import { 
  fetchMarketAccount, 
  parseTransactionEvents, 
  getMarketTransactionSignatures,
  findTokenByMarketAccount 
} from './blockchain-utils';

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

export async function syncHistoricalTradingData() {
  try {
    // console.log('🔄 Starting historical trading data sync...');
    
    const program = getProgram();
    const connection = getConnection();
    
    // Get all news accounts
    const newsAccounts = await program.account.newsAccount.all();
    // console.log(`📊 Found ${newsAccounts.length} news accounts`);
    
    // Get all market accounts
    const marketAccounts = await program.account.market.all();
    // console.log(`📊 Found ${marketAccounts.length} market accounts`);
    
    // Create a map of news account to market account
    const marketMap = new Map();
    marketAccounts.forEach(market => {
      marketMap.set(market.account.newsAccount.toString(), market);
    });
    
    let syncedTrades = 0;
    let syncedUsers = 0;
    
    // Process each news account
    for (const newsAccount of newsAccounts) {
      try {
        const marketData = marketMap.get(newsAccount.publicKey.toString());
        if (!marketData) {
          // console.log(`⚠️  No market data found for news account ${newsAccount.publicKey.toString()}`);
          continue;
        }
        
        // Find or create the corresponding token in database
        let token = await prisma.token.findFirst({
          where: {
            story: {
              id: newsAccount.publicKey.toString()
            }
          },
          include: {
            story: true
          }
        });
        
        if (!token) {
          // Create token if it doesn't exist
          const story = await prisma.story.upsert({
            where: { id: newsAccount.publicKey.toString() },
            update: {},
            create: {
              id: newsAccount.publicKey.toString(),
              headline: newsAccount.account.headline,
              author: newsAccount.account.authority.toString(),
              arweaveUrl: newsAccount.account.arweaveLink || 'https://arweave.net/placeholder',
              arweaveId: 'placeholder',
              onchainSignature: 'placeholder',
              createdAt: new Date()
            }
          });
          
          token = await prisma.token.create({
            data: {
              storyId: story.id,
              marketAddress: marketData.publicKey.toString(),
              mintAddress: marketData.account.mint.toString(),
              price: Number(marketData.account.currentPrice) / 1e9,
              priceChange24h: 0,
              volume24h: 0,
              marketCap: 0
            },
            include: {
              story: true
            }
          });
        }
        
        // Create or update user
        const author = newsAccount.account.authority.toString();
        await prisma.user.upsert({
          where: { walletAddress: author },
          update: {},
          create: {
            walletAddress: author,
            name: null
          }
        });
        syncedUsers++;
        
        // Check if we already have trades for this token
        const existingTrades = await prisma.trade.count({
          where: { tokenId: token.id }
        });
        
        if (existingTrades > 0) {
          // console.log(`✅ Token ${token.id} already has ${existingTrades} trades, skipping...`);
          continue;
        }
        
        // Parse real blockchain events instead of creating mock trades
        const marketAddress = marketData.publicKey.toString();
        
        // Get transaction signatures for this market
        const signatures = await getMarketTransactionSignatures(marketAddress, 50);
        
        for (const signature of signatures) {
          try {
            // Parse trading events from transaction
            const events = await parseTransactionEvents(signature);
            
            for (const event of events) {
              // Create or update user
              await prisma.user.upsert({
                where: { walletAddress: event.trader },
                update: {},
                create: {
                  walletAddress: event.trader,
                  name: null
                }
              });
              
              // Create trade record
              await prisma.trade.create({
                data: {
                  type: event.type === 'purchased' ? 'BUY' : 'SELL',
                  amount: event.amount,
                  priceAtTrade: event.price,
                  trader: {
                    connect: { walletAddress: event.trader }
                  },
                  token: {
                    connect: { id: token.id }
                  },
                  timestamp: event.timestamp
                }
              });
              
              syncedTrades++;
            }
          } catch (error) {
            // console.error(`Error parsing transaction ${signature}:`, error);
          }
        }
        
        // Update token statistics with real blockchain data
        const blockchainMarketData = await fetchMarketAccount(marketAddress);
        if (blockchainMarketData) {
          await prisma.token.update({
            where: { id: token.id },
            data: {
              price: blockchainMarketData.currentPrice,
              volume24h: blockchainMarketData.totalVolume,
              marketCap: blockchainMarketData.currentPrice * blockchainMarketData.currentSupply
            }
          });
        }
        
        // console.log(`✅ Synced token ${token.id} for story: ${newsAccount.account.headline}`);
        
      } catch (error) {
        // console.error(`❌ Error syncing news account ${newsAccount.publicKey.toString()}:`, error);
      }
    }
    
    // console.log(`🎉 Sync complete!`);
    // console.log(`   ✅ Synced users: ${syncedUsers}`);
    // console.log(`   ✅ Synced trades: ${syncedTrades}`);
    
  } catch (error) {
    // console.error('❌ Failed to sync historical trading data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export async function syncMissingTrades() {
  try {
    // console.log('🔄 Syncing missing trades...');
    
    // Find tokens without trades
    const tokensWithoutTrades = await prisma.token.findMany({
      where: {
        trades: {
          none: {}
        }
      },
      include: {
        story: true
      }
    });
    
    // console.log(`📊 Found ${tokensWithoutTrades.length} tokens without trades`);
    
    let syncedTrades = 0;
    
    for (const token of tokensWithoutTrades) {
      try {
        // Try to find real trades from blockchain instead of creating mock trades
        if (token.marketAddress) {
          const signatures = await getMarketTransactionSignatures(token.marketAddress, 20);
          
          let hasRealTrades = false;
          for (const signature of signatures) {
            const events = await parseTransactionEvents(signature);
            
            for (const event of events) {
              // Create or update user
              await prisma.user.upsert({
                where: { walletAddress: event.trader },
                update: {},
                create: {
                  walletAddress: event.trader,
                  name: null
                }
              });
              
              // Create trade record
              await prisma.trade.create({
                data: {
                  type: event.type === 'purchased' ? 'BUY' : 'SELL',
                  amount: event.amount,
                  priceAtTrade: event.price,
                  trader: {
                    connect: { walletAddress: event.trader }
                  },
                  token: {
                    connect: { id: token.id }
                  },
                  timestamp: event.timestamp
                }
              });
              
              syncedTrades++;
              hasRealTrades = true;
            }
          }
          
          if (hasRealTrades) {
            // console.log(`✅ Synced real trades for token ${token.id}`);
          } else {
            // console.log(`⚠️  No real trades found for token ${token.id}, skipping...`);
          }
        } else {
          // console.log(`⚠️  No market address for token ${token.id}, skipping...`);
        }
        
      } catch (error) {
        // console.error(`❌ Error syncing trades for token ${token.id}:`, error);
      }
    }
    
    // console.log(`🎉 Created ${syncedTrades} missing trades`);
    
  } catch (error) {
    // console.error('❌ Failed to sync missing trades:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI script
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'sync-historical':
      syncHistoricalTradingData();
      break;
    case 'sync-missing':
      syncMissingTrades();
      break;
    default:
      // console.log('Usage: tsx sync-blockchain-data.ts [sync-historical|sync-missing]');
      process.exit(1);
  }
}
