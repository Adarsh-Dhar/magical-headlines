import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { getConnection, getProgramId, getWallet } from "./config";

const PROGRAM_ID = getProgramId();
const connection = getConnection();
const wallet = getWallet();

export async function updateOnChainSummary(newsAccountPubkey: PublicKey, summaryLink: string) {
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program<NewsPlatform>(IDL as anchor.Idl, provider);

    // Find the PDA for the whitelist entry
    const [whitelistPda, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), wallet.publicKey.toBuffer()],
        program.programId
    );

    try {
        const txSignature = await program.methods
           .updateSummaryLink(summaryLink)
           .accounts({
                newsAccount: newsAccountPubkey,
                whitelist: whitelistPda,
                oracleAuthority: wallet.publicKey,
            } as any)
           .rpc();

        console.log(`Successfully updated summary on-chain. Transaction: ${txSignature}`);
    } catch (error) {
        console.error("Failed to update summary on-chain:", error);
    }
}