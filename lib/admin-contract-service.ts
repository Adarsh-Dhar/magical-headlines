/**
 * Admin contract service for on-chain admin operations
 * This service handles server-side admin operations using the oracle admin keypair
 */

import * as anchor from "@coral-xyz/anchor"
import { Connection, PublicKey, Keypair } from "@solana/web3.js"
import { Program, AnchorProvider } from "@coral-xyz/anchor"
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json'

// Constants
function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID || "HEqdzibcMw3Sz43ZJbgQxGzgx7mCXtz6j85E7saJhbJ3";
  return new PublicKey(id);
}

// PDA helpers
const findProfilePda = (user: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), user.toBuffer()],
    getProgramId()
  )[0];

const findSeasonPda = (seasonId: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("season"), new anchor.BN(seasonId).toArrayLike(Buffer, "le", 8)],
    getProgramId()
  )[0];

/**
 * Get the oracle admin keypair from environment
 */
function getAdminKeypair(): Keypair {
  const privateKeyString = process.env.ORACLE_ADMIN_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error('ORACLE_ADMIN_PRIVATE_KEY environment variable not set');
  }
  
  try {
    // Parse the private key (assuming it's base58 encoded)
    const privateKeyBytes = anchor.utils.bytes.bs58.decode(privateKeyString);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Failed to parse admin private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a program instance with admin keypair
 */
function getAdminProgram(): Program {
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed"
  );
  
  const adminKeypair = getAdminKeypair();
  const provider = new AnchorProvider(connection, adminKeypair, { commitment: "confirmed" });
  
  return new Program(NEWS_PLATFORM_IDL as any, provider);
}

/**
 * Initialize a new season on-chain
 * @param seasonId - The season ID to initialize
 * @returns Transaction signature
 */
export async function initializeSeasonOnChain(seasonId: number): Promise<string> {
  try {
    const program = getAdminProgram();
    const adminKeypair = getAdminKeypair();
    
    console.log(`Initializing season ${seasonId} on-chain...`);
    
    const signature = await program.methods
      .initializeSeason(new anchor.BN(seasonId))
      .accounts({
        season: findSeasonPda(seasonId),
        admin: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log(`Season ${seasonId} initialized successfully: ${signature}`);
    return signature;
  } catch (error) {
    console.error(`Error initializing season ${seasonId}:`, error);
    throw error;
  }
}

/**
 * Award a trophy to a user on-chain
 * @param userAddress - The user's wallet address
 * @returns Transaction signature
 */
export async function awardTrophyOnChain(userAddress: string): Promise<string> {
  try {
    const program = getAdminProgram();
    const adminKeypair = getAdminKeypair();
    const userPubkey = new PublicKey(userAddress);
    
    console.log(`Awarding trophy to ${userAddress} on-chain...`);
    
    const signature = await program.methods
      .awardTrophy()
      .accounts({
        profile: findProfilePda(userPubkey),
        user: userPubkey,
        admin: adminKeypair.publicKey,
      })
      .rpc();
    
    console.log(`Trophy awarded to ${userAddress} successfully: ${signature}`);
    return signature;
  } catch (error) {
    console.error(`Error awarding trophy to ${userAddress}:`, error);
    throw error;
  }
}

/**
 * Reset season PnL for a user on-chain
 * @param userAddress - The user's wallet address
 * @returns Transaction signature
 */
export async function resetSeasonPnlOnChain(userAddress: string): Promise<string> {
  try {
    const program = getAdminProgram();
    const adminKeypair = getAdminKeypair();
    const userPubkey = new PublicKey(userAddress);
    
    console.log(`Resetting season PnL for ${userAddress} on-chain...`);
    
    const signature = await program.methods
      .resetSeasonPnl()
      .accounts({
        profile: findProfilePda(userPubkey),
        user: userPubkey,
        admin: adminKeypair.publicKey,
      })
      .rpc();
    
    console.log(`Season PnL reset for ${userAddress} successfully: ${signature}`);
    return signature;
  } catch (error) {
    console.error(`Error resetting season PnL for ${userAddress}:`, error);
    throw error;
  }
}

/**
 * Award trophies to multiple users on-chain
 * @param userAddresses - Array of user wallet addresses
 * @returns Array of transaction signatures
 */
export async function awardTrophiesOnChain(userAddresses: string[]): Promise<string[]> {
  const signatures: string[] = [];
  
  for (const userAddress of userAddresses) {
    try {
      const signature = await awardTrophyOnChain(userAddress);
      signatures.push(signature);
      
      // Add a small delay between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to award trophy to ${userAddress}:`, error);
      // Continue with other users even if one fails
    }
  }
  
  return signatures;
}

/**
 * Reset season PnL for multiple users on-chain
 * @param userAddresses - Array of user wallet addresses
 * @returns Array of transaction signatures
 */
export async function resetSeasonPnlForUsersOnChain(userAddresses: string[]): Promise<string[]> {
  const signatures: string[] = [];
  
  for (const userAddress of userAddresses) {
    try {
      const signature = await resetSeasonPnlOnChain(userAddress);
      signatures.push(signature);
      
      // Add a small delay between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to reset season PnL for ${userAddress}:`, error);
      // Continue with other users even if one fails
    }
  }
  
  return signatures;
}
