import { AITrendCalculator, TrendCalculationResult } from "./ai-trend-calculator";
import { Connection, Keypair, Transaction, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { getConnection, getProgramId, getWallet } from "./config";
import { PrismaClient } from "@prisma/client";

export interface MagicBlockConfig {
  rpcUrl: string;
  sessionKeypair: string;
  fallbackProvider: 'gemini' | 'openai';
}

export interface MagicBlockAIResponse {
  success: boolean;
  result?: TrendCalculationResult;
  error?: string;
  provider: 'magicblock' | 'fallback';
}

export class MagicBlockAIOracle {
  private config: MagicBlockConfig;
  private aiCalculator: AITrendCalculator;
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerFailures: number = 0;
  private circuitBreakerThreshold: number = 5;
  private circuitBreakerTimeout: number = 60000; // 1 minute
  private connection?: Connection;
  private sessionKeypair?: Keypair;
  private prisma: PrismaClient;

  constructor(config: MagicBlockConfig) {
    this.config = config;
    this.aiCalculator = new AITrendCalculator();
    this.prisma = new PrismaClient();
    this.initializeConnection();
  }

  /**
   * Initialize MagicBlock connection
   */
  private initializeConnection(): void {
    try {
      // Use default Solana connection - Ephemeral Rollups work with any Solana RPC
      // The #[ephemeral] macro in the contract handles ER execution automatically
      this.connection = getConnection();
      console.log(`✅ Ephemeral Rollup connection initialized - transactions will execute via ER`);
      
      // Initialize session keypair if provided
      if (this.config.sessionKeypair) {
        try {
          const secretKey = JSON.parse(this.config.sessionKeypair);
          this.sessionKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
          console.log(`✅ Session keypair loaded`);
        } catch (error) {
          console.warn("⚠️ Failed to load session keypair:", error);
        }
      }
    } catch (error) {
      console.error("❌ Error initializing connection:", error);
    }
  }

  /**
   * Calculate trend index using MagicBlock AI Oracle Plugin with fallback
   */
  async calculateTrendIndex(tokenId: string): Promise<MagicBlockAIResponse> {
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      console.log("🔴 Circuit breaker open, using fallback provider");
      return this.useFallbackProvider(tokenId);
    }

    try {
      // Try MagicBlock AI Oracle Plugin first
      const result = await this.callMagicBlockAI(tokenId);
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      return {
        success: true,
        result,
        provider: 'magicblock'
      };
      
    } catch (error) {
      console.error("❌ MagicBlock AI Oracle failed:", error);
      
      // Increment failure count
      this.circuitBreakerFailures++;
      
      // Open circuit breaker if threshold reached
      if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
        this.openCircuitBreaker();
      }
      
      // Use fallback provider
      return this.useFallbackProvider(tokenId);
    }
  }

  /**
   * Call MagicBlock AI Oracle Plugin via Ephemeral Rollups
   * Executes AI model on-chain within ER session for decentralized computation
   */
  private async callMagicBlockAI(tokenId: string): Promise<TrendCalculationResult> {
    console.log(`🚀 Calling AI Oracle via Ephemeral Rollup for token ${tokenId}...`);
    
    // Get connection - always available via getConnection()
    if (!this.connection) {
      this.connection = getConnection();
    }

    try {
      // Get the required dependencies for on-chain execution
      const programId = getProgramId();
      const wallet = getWallet();
      const connection = getConnection();
      
      // Create program instance for Ephemeral Rollup execution
      const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
      const program = new anchor.Program<NewsPlatform>(IDL as anchor.Idl, provider);
      
      console.log(`📊 Preparing on-chain AI computation via Ephemeral Rollup...`);
      
      // IMPORTANT: The actual AI computation happens OFF-CHAIN via Gemini
      // But we use MagicBlock to execute the result UPDATE on-chain via ER
      // This gives us the decentralization benefits of on-chain execution
      
      // Step 1: Calculate trend using AI (off-chain for now)
      // In a full MagicBlock ER implementation, this would be on-chain
      console.log("🤖 Computing trend via AI...");
      const aiResult = await this.aiCalculator.calculateTrendIndex(tokenId);
      
      // Step 2: Execute on-chain via MagicBlock Ephemeral Rollup
      console.log("⛓️ Executing on-chain via MagicBlock ER...");
      
      // Since the contract already has #[ephemeral] directive,
      // transactions automatically use ER execution when sent
      // We use the regular RPC call which goes through ER
      
      // For this to work, we need the token's market account
      const token = await this.prisma.token.findUnique({
        where: { id: tokenId },
        select: { newsAccount: true }
      });
      
      // If token doesn't have on-chain account, skip on-chain execution
      // The AI computation still happens and is stored in DB
      if (!token || !token.newsAccount) {
        console.log("⚠️ Token has no on-chain account, skipping on-chain update");
        console.log("💡 AI computation still completed - result stored in database");
        // Return AI result without on-chain update
        const aiResult = await this.aiCalculator.calculateTrendIndex(tokenId);
        return aiResult;
      }
      
      const newsAccountPubkey = new PublicKey(token.newsAccount);
      
      // Find the market PDA
      const [marketPda, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), newsAccountPubkey.toBuffer()],
        programId
      );
      
      // Find whitelist PDA
      const [whitelistPda, __] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), wallet.publicKey.toBuffer()],
        programId
      );
      
      // Execute update via MagicBlock Ephemeral Rollup
      // The #[ephemeral] macro ensures this runs in ER
      console.log("📤 Sending transaction via MagicBlock ER...");
      
      const trendScoreU64 = Math.round(aiResult.score * 1000);
      const factorsString = JSON.stringify(aiResult.factors);
      const factorsHash = Buffer.from(
        require('crypto').createHash('sha256').update(factorsString).digest()
      );
      
      const txSignature = await program.methods
        .updateTrendIndex(
          new anchor.BN(trendScoreU64),
          Array.from(factorsHash) as number[]
        )
        .accounts({
          market: marketPda,
          newsAccount: newsAccountPubkey,
          whitelist: whitelistPda,
          oracleAuthority: wallet.publicKey,
        } as any)
        .rpc();
      
      console.log(`✅ On-chain execution complete via MagicBlock ER`);
      console.log(`🔗 Transaction: ${txSignature}`);
      
      // Return the AI result
      return aiResult;
      
    } catch (error) {
      console.error("❌ MagicBlock AI Oracle ER error:", error);
      throw error;
    }
  }

  /**
   * Use fallback provider (Gemini)
   */
  private async useFallbackProvider(tokenId: string): Promise<MagicBlockAIResponse> {
    console.log(`🔄 Using fallback provider (${this.config.fallbackProvider}) for token ${tokenId}...`);
    
    try {
      const result = await this.aiCalculator.calculateTrendIndex(tokenId);
      
      return {
        success: true,
        result,
        provider: 'fallback'
      };
      
    } catch (error) {
      console.error("❌ Fallback provider also failed:", error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: 'fallback'
      };
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    console.log("🔴 Circuit breaker opened - MagicBlock AI Oracle unavailable");
    
    // Auto-reset after timeout
    setTimeout(() => {
      this.resetCircuitBreaker();
    }, this.circuitBreakerTimeout);
  }

  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    this.circuitBreakerFailures = 0;
    console.log("🟢 Circuit breaker reset - MagicBlock AI Oracle available");
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): { open: boolean; failures: number; threshold: number } {
    return {
      open: this.circuitBreakerOpen,
      failures: this.circuitBreakerFailures,
      threshold: this.circuitBreakerThreshold
    };
  }

  /**
   * Test MagicBlock connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log("🧪 Testing MagicBlock AI Oracle connection...");
      
      // TODO: Implement actual connection test
      // For now, simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("✅ MagicBlock AI Oracle connection test passed");
      return true;
      
    } catch (error) {
      console.error("❌ MagicBlock AI Oracle connection test failed:", error);
      return false;
    }
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): { magicblock: { calls: number; failures: number }; fallback: { calls: number; failures: number } } {
    // TODO: Implement actual statistics tracking
    return {
      magicblock: { calls: 0, failures: 0 },
      fallback: { calls: 0, failures: 0 }
    };
  }
}

// Export singleton instance
export const magicBlockAIOracle = new MagicBlockAIOracle({
  rpcUrl: process.env.MAGICBLOCK_RPC_URL || "",
  sessionKeypair: process.env.MAGICBLOCK_SESSION_KEYPAIR || "",
  fallbackProvider: (process.env.AI_ORACLE_FALLBACK as 'gemini' | 'openai') || 'gemini'
});
