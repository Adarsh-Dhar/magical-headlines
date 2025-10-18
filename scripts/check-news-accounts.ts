#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import IDL from "../contract1/target/idl/news_platform.json";
import type { NewsPlatform } from "../contract1/target/types/news_platform";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = process.env.PROGRAM_ID || "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf";

async function checkNewsAccounts() {
  try {
    console.log("🔍 Checking for existing news accounts...");
    console.log(`🌐 RPC: ${RPC_URL}`);
    console.log(`📋 Program ID: ${PROGRAM_ID}`);
    
    const connection = new Connection(RPC_URL, "confirmed");
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // Read-only
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);
    
    // Fetch all news accounts
    const accounts = await program.account.newsAccount.all();
    
    console.log(`📊 Found ${accounts.length} news accounts:`);
    
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(`\n📰 Account ${i + 1}:`);
      console.log(`   Address: ${account.publicKey.toBase58()}`);
      console.log(`   Headline: ${account.account.headline}`);
      console.log(`   Arweave Link: ${account.account.arweaveLink}`);
      console.log(`   Summary Link: ${account.account.summaryLink || "None"}`);
      console.log(`   Published: ${new Date(Number(account.account.publishedAt) * 1000).toISOString()}`);
      console.log(`   Mint: ${account.account.mint.toBase58()}`);
      console.log(`   Authority: ${account.account.authority.toBase58()}`);
    }
    
    if (accounts.length === 0) {
      console.log("ℹ️  No news accounts found. Create a story from the frontend to test the oracle.");
    }
    
  } catch (error) {
    console.error("❌ Failed to check news accounts:", error);
  }
}

checkNewsAccounts().catch(console.error);

