import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { getConnection, getProgramId, getWallet } from "./config";

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