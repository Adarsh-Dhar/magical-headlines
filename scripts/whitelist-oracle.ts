#!/usr/bin/env tsx

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import IDL from "../contract/target/idl/news_platform.json";
import type { NewsPlatform } from "../contract/target/types/news_platform";

// Configuration - update these values
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = process.env.PROGRAM_ID || "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf";

// Admin keypair path - update this to your admin wallet
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || "./admin-keypair.json";

// Oracle public key - update this to your oracle's public key
const ORACLE_PUBLIC_KEY = process.env.ORACLE_PUBLIC_KEY;

if (!ORACLE_PUBLIC_KEY) {
  console.error("❌ Please set ORACLE_PUBLIC_KEY environment variable");
  console.error("   Get it with: solana-keygen pubkey oracle-keypair.json");
  process.exit(1);
}

async function loadKeypair(filePath: string): Promise<anchor.web3.Keypair> {
  try {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const file = fs.readFileSync(resolvedPath, "utf8");
    const json = JSON.parse(file);
    
    if (Array.isArray(json)) {
      return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(json));
    }
    if (json.secretKey && Array.isArray(json.secretKey)) {
      return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(json.secretKey));
    }
    
    throw new Error("Invalid keypair format");
  } catch (error) {
    console.error(`❌ Failed to load keypair from ${filePath}:`, error);
    process.exit(1);
  }
}

async function whitelistOracle() {
  try {
    console.log("🚀 Starting oracle whitelist process...");
    
    // Load admin keypair
    console.log(`📁 Loading admin keypair from: ${ADMIN_KEYPAIR_PATH}`);
    const adminKeypair = await loadKeypair(ADMIN_KEYPAIR_PATH);
    console.log(`👤 Admin wallet: ${adminKeypair.publicKey.toBase58()}`);
    
    // Parse oracle public key
    const oraclePubkey = new PublicKey(ORACLE_PUBLIC_KEY);
    console.log(`🔑 Oracle public key: ${oraclePubkey.toBase58()}`);
    
    // Setup connection and program
    const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
    const wallet = new anchor.Wallet(adminKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);
    
    console.log(`🌐 RPC: ${RPC_URL}`);
    console.log(`📋 Program ID: ${program.programId.toBase58()}`);
    
    // Find PDAs
    const [oraclePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("oracle")],
      program.programId
    );
    
    const [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), oraclePubkey.toBuffer()],
      program.programId
    );
    
    console.log(`🏛️  Oracle PDA: ${oraclePda.toBase58()}`);
    console.log(`📝 Whitelist PDA: ${whitelistPda.toBase58()}`);
    
    // Check if oracle is already whitelisted
    try {
      const whitelistAccount = await program.account.whitelistedAuthority.fetch(whitelistPda);
      if (whitelistAccount.isActive) {
        console.log("✅ Oracle is already whitelisted!");
        return;
      }
    } catch (error) {
      console.log("ℹ️  Oracle not yet whitelisted, proceeding...");
    }
    
    // Call add_authority
    console.log("📤 Calling add_authority instruction...");
    const signature = await program.methods
      .addAuthority(oraclePubkey)
      .accounts({
        whitelist: whitelistPda,
        oracle: oraclePda,
        admin: adminKeypair.publicKey,
        authority: oraclePubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log(`✅ Oracle whitelisted successfully!`);
    console.log(`📋 Transaction signature: ${signature}`);
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
  } catch (error) {
    console.error("❌ Failed to whitelist oracle:", error);
    process.exit(1);
  }
}

// Run the script
whitelistOracle().catch(console.error);
