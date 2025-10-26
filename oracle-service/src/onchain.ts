import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { getConnection, getProgramId, getWallet } from "./config";
import { TrendCalculationResult } from "./ai-trend-calculator";

const PROGRAM_ID = getProgramId();
const connection = getConnection();
const wallet = getWallet();

export async function updateOnChainSummary(newsAccountPubkey: PublicKey, summaryLink: string) {
    console.log("⛓️  ========================================");
    console.log("🔗 Updating summary on-chain...");
    console.log(`📰 News Account: ${newsAccountPubkey.toBase58()}`);
    console.log(`🔗 Summary Link: ${summaryLink}`);
    console.log("⛓️  ========================================");
    
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program<NewsPlatform>(IDL as anchor.Idl, provider);

    // Find the PDA for the whitelist entry
    const [whitelistPda, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), wallet.publicKey.toBuffer()],
        program.programId
    );
    
    console.log(`🔑 Oracle Authority: ${wallet.publicKey.toBase58()}`);
    console.log(`🔑 Whitelist PDA: ${whitelistPda.toBase58()}`);

    try {
        console.log("📝 Building transaction...");
        const txSignature = await program.methods
           .updateSummaryLink(summaryLink)
           .accounts({
                newsAccount: newsAccountPubkey,
                whitelist: whitelistPda,
                oracleAuthority: wallet.publicKey,
            } as any)
           .rpc();

        console.log("✅ ========================================");
        console.log("✅ Successfully updated summary on-chain!");
        console.log(`🔗 Transaction: ${txSignature}`);
        console.log(`🌐 Explorer: https://explorer.solana.com/tx/${txSignature}`);
        console.log("✅ ========================================");
    } catch (error) {
        console.error("❌ ========================================");
        console.error("❌ Failed to update summary on-chain:", error);
        console.error("❌ ========================================");
        throw error;
    }
}

export async function updateTrendIndexOnChain(
    newsAccountPubkey: PublicKey, 
    trendResult: TrendCalculationResult
): Promise<string> {
    console.log("⛓️  ========================================");
    console.log("🤖 Updating AI trend index on-chain...");
    console.log(`📰 News Account: ${newsAccountPubkey.toBase58()}`);
    console.log(`📊 Trend Score: ${trendResult.score}`);
    console.log(`🎯 Confidence: ${trendResult.confidence}`);
    console.log("⛓️  ========================================");
    
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program<NewsPlatform>(IDL as anchor.Idl, provider);

    // Find the PDA for the whitelist entry
    const [whitelistPda, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), wallet.publicKey.toBuffer()],
        program.programId
    );

    // Find the PDA for the market account
    const [marketAccount, __] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), newsAccountPubkey.toBuffer()],
        program.programId
    );
    
    console.log(`🔑 Oracle Authority: ${wallet.publicKey.toBase58()}`);
    console.log(`🔑 Whitelist PDA: ${whitelistPda.toBase58()}`);
    console.log(`🔑 Market PDA: ${marketAccount.toBase58()}`);

    try {
        // Convert trend score to u64 (scale 0-100 to 0-100000)
        const trendScoreU64 = Math.round(trendResult.score * 1000);
        
        // Generate factors hash for verification
        const factorsString = JSON.stringify(trendResult.factors);
        const factorsHash = Buffer.from(
            require('crypto').createHash('sha256').update(factorsString).digest()
        );

        console.log("📝 Building trend index update transaction...");
        console.log(`📊 Trend Score (u64): ${trendScoreU64}`);
        console.log(`🔐 Factors Hash: ${factorsHash.toString('hex')}`);

        const txSignature = await program.methods
           .updateTrendIndex(
               new anchor.BN(trendScoreU64),
               Array.from(factorsHash) as number[]
           )
           .accounts({
                market: marketAccount,
                newsAccount: newsAccountPubkey,
                whitelist: whitelistPda,
                oracleAuthority: wallet.publicKey,
            } as any)
           .rpc();

        console.log("✅ ========================================");
        console.log("✅ Successfully updated trend index on-chain!");
        console.log(`🔗 Transaction: ${txSignature}`);
        console.log(`🌐 Explorer: https://explorer.solana.com/tx/${txSignature}`);
        console.log("✅ ========================================");
        
        return txSignature;
        
    } catch (error) {
        console.error("❌ ========================================");
        console.error("❌ Failed to update trend index on-chain:", error);
        console.error("❌ ========================================");
        throw error;
    }
}