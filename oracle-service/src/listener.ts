#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getConnection, getProgramId } from "./config";
import { handleNewArticle } from "./article";
import { processTokensPurchasedEvent, processTokensSoldEvent, processTokensStakedEvent, processTokensUnstakedEvent, processFeesClaimedEvent } from "./trading-events";
import { trendOrchestrator } from "./trend-orchestrator";
import IDL from "../../contract/target/idl/news_platform.json";
import type { NewsPlatform } from "../../contract/target/types/news_platform";

async function processExistingAccounts() {
  try {
    const connection = getConnection();
    const programId = getProgramId();
    
    
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // Read-only
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);
    
    // Fetch all news accounts
    const accounts = await program.account.newsAccount.all();
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const account of accounts) {
      try {
        // Check if account already has a summary
        if (account.account.summaryLink && account.account.summaryLink.trim() !== "") {
          skippedCount++;
          continue;
        }
        
        
        // Process the account - we need to get the raw account data
        const accountInfo = await connection.getAccountInfo(account.publicKey);
        if (accountInfo) {
          await handleNewArticle(account.publicKey, accountInfo.data);
        }
        processedCount++;
        
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
      }
    }
    
    
  } catch (error) {
  }
}

async function startListener() {
  try {
    const connection = getConnection();
    const programId = getProgramId();
    
    
    // Test connection first
    try {
      const latestBlockhash = await connection.getLatestBlockhash();
    } catch (error) {
      process.exit(1);
    }
    
    // First, process existing accounts without summaries
    await processExistingAccounts();
    
    // Set up program for event listening
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // Read-only
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);

    // Listen for trading events
    program.addEventListener('tokensPurchased', async (event, slot, signature) => {
      try {
        
        await processTokensPurchasedEvent(event, signature);
      } catch (error) {
      }
    });

    program.addEventListener('tokensSold', async (event, slot, signature) => {
      try {
        
        await processTokensSoldEvent(event, signature);
      } catch (error) {
      }
    });

    program.addEventListener('tokensStaked', async (event, slot, signature) => {
      try {
        
        await processTokensStakedEvent(event, signature);
      } catch (error) {
      }
    });

    program.addEventListener('tokensUnstaked', async (event, slot, signature) => {
      try {
        
        await processTokensUnstakedEvent(event, signature);
      } catch (error) {
      }
    });

    program.addEventListener('feesClaimed', async (event, slot, signature) => {
      try {
        
        await processFeesClaimedEvent(event, signature);
      } catch (error) {
      }
    });

    // Then listen for new NewsAccount accounts
    connection.onProgramAccountChange(
      programId,
      async (accountInfo, context) => {
        try {
          const accountData = accountInfo.accountInfo.data;
          const accountId = accountInfo.accountId;
          
          
          // Process the new account
          await handleNewArticle(accountId, accountData);
          
        } catch (error) {
        }
      },
      "confirmed"
    );
    
    
    // Start the AI Trend Orchestrator
    console.log("🚀 Starting AI Trend Orchestrator...");
    await trendOrchestrator.start();
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log("🛑 Shutting down gracefully...");
      await trendOrchestrator.stop();
      process.exit(0);
    });
    
  } catch (error) {
    process.exit(1);
  }
}

// Start the listener
startListener().catch(() => {});
