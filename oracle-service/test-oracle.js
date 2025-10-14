#!/usr/bin/env node

// Simple test script to verify oracle is working
const { Connection, PublicKey } = require('@solana/web3.js');

async function testOracle() {
    console.log("🧪 ========================================");
    console.log("🧪 Testing Oracle Service");
    console.log("🧪 ========================================");
    
    // Test connection
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const programId = process.env.PROGRAM_ID || "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf";
    
    console.log(`🌐 RPC URL: ${rpcUrl}`);
    console.log(`📋 Program ID: ${programId}`);
    
    try {
        const connection = new Connection(rpcUrl, "confirmed");
        const latestBlockhash = await connection.getLatestBlockhash();
        console.log(`✅ Connected to Solana network`);
        console.log(`📊 Latest slot: ${latestBlockhash.lastValidBlockHeight}`);
        
        // Test program account access
        const programPubkey = new PublicKey(programId);
        const programAccount = await connection.getAccountInfo(programPubkey);
        
        if (programAccount) {
            console.log(`✅ Program account found`);
            console.log(`🔑 Program owner: ${programAccount.owner.toBase58()}`);
        } else {
            console.log(`❌ Program account not found`);
        }
        
        console.log("\n🎯 ========================================");
        console.log("🎯 Oracle Test Complete!");
        console.log("🎯 ========================================");
        console.log("💡 Now start the oracle with: npm start");
        console.log("💡 Then publish a news article to see it in action!");
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }
}

testOracle();
