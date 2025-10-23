#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getConnection, getProgramId } from "./config";
import { handleNewArticle } from "./article";
import { processTokensPurchasedEvent, processTokensSoldEvent, processTokensStakedEvent, processTokensUnstakedEvent, processFeesClaimedEvent } from "./trading-events";
import IDL from "../../contract/target/idl/news_platform.json";
import type { NewsPlatform } from "../../contract/target/types/news_platform";

async function processExistingAccounts() {
  try {
    const connection = getConnection();
    const programId = getProgramId();
    
    console.log("🔍 Processing existing news accounts without summaries...");
    
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // Read-only
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);
    
    // Fetch all news accounts
    const accounts = await program.account.newsAccount.all();
    console.log(`📊 Found ${accounts.length} total news accounts`);
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const account of accounts) {
      try {
        // Check if account already has a summary
        if (account.account.summaryLink && account.account.summaryLink.trim() !== "") {
          skippedCount++;
          continue;
        }
        
        console.log(`🔄 Processing account without summary: ${account.publicKey.toBase58()}`);
        console.log(`   Headline: ${account.account.headline}`);
        
        // Process the account - we need to get the raw account data
        const accountInfo = await connection.getAccountInfo(account.publicKey);
        if (accountInfo) {
          await handleNewArticle(account.publicKey, accountInfo.data);
        }
        processedCount++;
        
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing account ${account.publicKey.toBase58()}:`, error);
      }
    }
    
    console.log(`✅ Processed ${processedCount} accounts, skipped ${skippedCount} accounts with existing summaries`);
    
  } catch (error) {
    console.error("❌ Failed to process existing accounts:", error);
  }
}

async function startListener() {
  try {
    const connection = getConnection();
    const programId = getProgramId();
    
    console.log("🚀 ========================================");
    console.log("🔍 Starting oracle listener...");
    console.log(`📋 Program ID: ${programId.toBase58()}`);
    console.log(`🌐 RPC: ${connection.rpcEndpoint}`);
    console.log("🚀 ========================================");
    
    // Test connection first
    try {
      const latestBlockhash = await connection.getLatestBlockhash();
      console.log(`✅ Connected to Solana network. Latest slot: ${latestBlockhash.lastValidBlockHeight}`);
    } catch (error) {
      console.error("❌ Failed to connect to Solana network:", error);
      process.exit(1);
    }
    
    // First, process existing accounts without summaries
    await processExistingAccounts();
    
    // Set up program for event listening
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // Read-only
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);

    // Listen for trading events
    console.log("👂 Setting up trading event listeners...");
    program.addEventListener('tokensPurchased', async (event, slot, signature) => {
      try {
        console.log("\n💰 ========================================");
        console.log(`🛒 TOKENS PURCHASED EVENT!`);
        console.log(`🔑 Signature: ${signature}`);
        console.log(`📊 Slot: ${slot}`);
        console.log(`⏰ Time: ${new Date().toISOString()}`);
        console.log("💰 ========================================\n");
        
        await processTokensPurchasedEvent(event, signature);
      } catch (error) {
        console.error("❌ Error processing TokensPurchased event:", error);
      }
    });

    program.addEventListener('tokensSold', async (event, slot, signature) => {
      try {
        console.log("\n💸 ========================================");
        console.log(`💱 TOKENS SOLD EVENT!`);
        console.log(`🔑 Signature: ${signature}`);
        console.log(`📊 Slot: ${slot}`);
        console.log(`⏰ Time: ${new Date().toISOString()}`);
        console.log("💸 ========================================\n");
        
        await processTokensSoldEvent(event, signature);
      } catch (error) {
        console.error("❌ Error processing TokensSold event:", error);
      }
    });

    program.addEventListener('tokensStaked', async (event, slot, signature) => {
      try {
        console.log("\n🔒 ========================================");
        console.log(`🔐 TOKENS STAKED EVENT!`);
        console.log(`🔑 Signature: ${signature}`);
        console.log(`📊 Slot: ${slot}`);
        console.log(`⏰ Time: ${new Date().toISOString()}`);
        console.log("🔒 ========================================\n");
        
        await processTokensStakedEvent(event, signature);
      } catch (error) {
        console.error("❌ Error processing TokensStaked event:", error);
      }
    });

    program.addEventListener('tokensUnstaked', async (event, slot, signature) => {
      try {
        console.log("\n🔓 ========================================");
        console.log(`🔓 TOKENS UNSTAKED EVENT!`);
        console.log(`🔑 Signature: ${signature}`);
        console.log(`📊 Slot: ${slot}`);
        console.log(`⏰ Time: ${new Date().toISOString()}`);
        console.log("🔓 ========================================\n");
        
        await processTokensUnstakedEvent(event, signature);
      } catch (error) {
        console.error("❌ Error processing TokensUnstaked event:", error);
      }
    });

    program.addEventListener('feesClaimed', async (event, slot, signature) => {
      try {
        console.log("\n💰 ========================================");
        console.log(`💎 FEES CLAIMED EVENT!`);
        console.log(`🔑 Signature: ${signature}`);
        console.log(`📊 Slot: ${slot}`);
        console.log(`⏰ Time: ${new Date().toISOString()}`);
        console.log("💰 ========================================\n");
        
        await processFeesClaimedEvent(event, signature);
      } catch (error) {
        console.error("❌ Error processing FeesClaimed event:", error);
      }
    });

    // Then listen for new NewsAccount accounts
    console.log("👂 Setting up account change listener...");
    connection.onProgramAccountChange(
      programId,
      async (accountInfo, context) => {
        try {
          const accountData = accountInfo.accountInfo.data;
          const accountId = accountInfo.accountId;
          
          console.log("\n🎉 ========================================");
          console.log(`📰 NEW ACCOUNT DETECTED!`);
          console.log(`🔑 Account ID: ${accountId.toBase58()}`);
          console.log(`📊 Slot: ${context.slot}`);
          console.log(`⏰ Time: ${new Date().toISOString()}`);
          console.log("🎉 ========================================\n");
          
          // Process the new account
          await handleNewArticle(accountId, accountData);
          
        } catch (error) {
          console.error("❌ Error processing account:", error);
        }
      },
      "confirmed"
    );
    
    console.log("✅ Oracle listener started successfully");
    console.log("🔄 Listening for new news accounts and trading events...");
    console.log("💡 Try publishing a news article or trading tokens to see the oracle in action!");
    console.log("🛑 Press Ctrl+C to stop the listener");
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log("\n🛑 Shutting down oracle listener...");
      process.exit(0);
    });
    
  } catch (error) {
    console.error("❌ Failed to start oracle listener:", error);
    process.exit(1);
  }
}

// Start the listener
startListener().catch(console.error);
