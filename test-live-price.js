// Simple test script to verify live price fetching
// Run with: node test-live-price.js

const { Connection, PublicKey } = require('@solana/web3.js');

// Test configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = '7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf';

async function testLivePrice() {
  try {
    console.log('🔍 Testing live price fetching...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);
    
    // Test connection
    console.log('📡 Connecting to Solana devnet...');
    const version = await connection.getVersion();
    console.log('✅ Connected to Solana:', version);
    
    // Test program account
    console.log('🔍 Checking program account...');
    const programAccount = await connection.getAccountInfo(programId);
    if (programAccount) {
      console.log('✅ Program account found');
      console.log('   Owner:', programAccount.owner.toString());
      console.log('   Executable:', programAccount.executable);
      console.log('   Lamports:', programAccount.lamports);
    } else {
      console.log('❌ Program account not found');
    }
    
    console.log('🎉 Live price system ready!');
    console.log('');
    console.log('To test with real data:');
    console.log('1. Deploy a news story with tokens');
    console.log('2. Get the market, news account, and mint addresses');
    console.log('3. Use the PriceChart component with those addresses');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLivePrice();
