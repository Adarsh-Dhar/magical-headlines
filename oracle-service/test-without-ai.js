#!/usr/bin/env node

// Test script to show oracle is working without AI processing
const { Connection, PublicKey } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

async function testOracleDetection() {
    console.log("🧪 ========================================");
    console.log("🧪 Testing Oracle Detection (No AI)");
    console.log("🧪 ========================================");
    
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const programId = process.env.PROGRAM_ID || "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf";
    
    try {
        const connection = new Connection(rpcUrl, "confirmed");
        const programPubkey = new PublicKey(programId);
        
        console.log("🔍 Monitoring for new accounts...");
        console.log("💡 Publish a news article in your frontend to see detection!");
        console.log("🛑 Press Ctrl+C to stop");
        
        let accountCount = 0;
        
        connection.onProgramAccountChange(
            programPubkey,
            (accountInfo, context) => {
                accountCount++;
                console.log("\n🎉 ========================================");
                console.log(`📰 ACCOUNT DETECTED! (#${accountCount})`);
                console.log(`🔑 Account ID: ${accountInfo.accountId.toBase58()}`);
                console.log(`📊 Slot: ${context.slot}`);
                console.log(`⏰ Time: ${new Date().toISOString()}`);
                console.log(`📏 Data Size: ${accountInfo.accountInfo.data.length} bytes`);
                console.log("🎉 ========================================\n");
            },
            "confirmed"
        );
        
        // Keep running
        process.on('SIGINT', () => {
            console.log("\n🛑 Stopping oracle test...");
            process.exit(0);
        });
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }
}

testOracleDetection();
