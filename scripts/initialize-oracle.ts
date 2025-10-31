#!/usr/bin/env tsx

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import IDL from "../contract/target/idl/news_platform.json";
import type { NewsPlatform } from "../contract/target/types/news_platform";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = process.env.PROGRAM_ID || "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf";
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || "./admin-keypair.json";

async function loadKeypair(filePath: string): Promise<anchor.web3.Keypair> {
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
}

async function initializeOracle() {
  try {
    console.log("🚀 Initializing oracle...");
    
    const adminKeypair = await loadKeypair(ADMIN_KEYPAIR_PATH);
    console.log(`👤 Admin wallet: ${adminKeypair.publicKey.toBase58()}`);
    
    const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
    const wallet = new anchor.Wallet(adminKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);
    
    const [oraclePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("oracle")],
      program.programId
    );
    
    console.log(`🏛️  Oracle PDA: ${oraclePda.toBase58()}`);
    
    // Check if already initialized
    try {
      await program.account.oracle.fetch(oraclePda);
      console.log("✅ Oracle already initialized!");
      return;
    } catch (error) {
      console.log("ℹ️  Oracle not initialized, proceeding...");
    }
    
    // Initialize oracle
    console.log("📤 Calling initialize_oracle instruction...");
    const signature = await program.methods
      .initializeOracle()
      .accounts({
        oracle: oraclePda,
        admin: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log(`✅ Oracle initialized successfully!`);
    console.log(`📋 Transaction signature: ${signature}`);
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
  } catch (error) {
    console.error("❌ Failed to initialize oracle:", error);
    process.exit(1);
  }
}

initializeOracle().catch(console.error);
