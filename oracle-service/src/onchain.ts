import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";

const PROGRAM_ID = new PublicKey("7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// This keypair's public key must be added as a whitelisted authority
// by the admin calling the `add_authority` function in your contract.
const oracleKeypair = anchor.web3.Keypair.generate();
const wallet = new anchor.Wallet(oracleKeypair);

export async function updateOnChainSummary(newsAccountPubkey: PublicKey, summaryLink: string) {
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program<NewsPlatform>(IDL as anchor.Idl, provider);

    // Find the PDA for the whitelist entry
    const [whitelistPda, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), oracleKeypair.publicKey.toBuffer()],
        program.programId
    );

    try {
        const txSignature = await program.methods
           .updateSummaryLink(summaryLink)
           .accounts({
                newsAccount: newsAccountPubkey,
                whitelist: whitelistPda,
                oracleAuthority: oracleKeypair.publicKey,
            } as any)
           .rpc();

        console.log(`Successfully updated summary on-chain. Transaction: ${txSignature}`);
    } catch (error) {
        console.error("Failed to update summary on-chain:", error);
    }
}