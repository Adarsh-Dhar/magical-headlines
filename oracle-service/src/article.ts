import { OpenAI } from "openai";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { updateOnChainSummary } from "./onchain";
import fetch from "node-fetch";

const PROGRAM_ID = new PublicKey("7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Assume you have a function to upload data to Arweave
// using a library like Bundlr
async function uploadToArweave(data: string): Promise<string> {
    //... implementation for uploading to Arweave...
    const arweaveLink = "https://arweave.net/UNIQUE_ID_FOR_SUMMARY";
    return arweaveLink;
}

export async function handleNewArticle(accountId: PublicKey, data: Buffer) {
    // 1. Decode the account data to get the Arweave link
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as anchor.Idl, provider);
    const newsAccount = await program.coder.accounts.decode("newsAccount", data);

    console.log(`Processing article: ${newsAccount.headline}`);

    // 2. Fetch the full article content from Arweave
    const articleResponse = await fetch(newsAccount.arweaveLink);
    const articleContent = await articleResponse.text();

    // 3. Call the AI service to generate a summary
    const openai = new OpenAI({ apiKey: "YOUR_OPENAI_API_KEY" });
    const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant that summarizes news articles."
            },
            {
                role: "user",
                content: `Please summarize this article: ${articleContent}`
            }
        ]
    });
    const summary = summaryResponse.choices[0]?.message?.content;

    if (!summary) {
        console.error("Failed to generate summary.");
        return;
    }

    // 4. Upload the summary to Arweave
    const summaryLink = await uploadToArweave(summary);
    console.log(`Generated summary and uploaded to: ${summaryLink}`);

    // 5. Call the on-chain program to update the summary link
    await updateOnChainSummary(accountId, summaryLink);
}