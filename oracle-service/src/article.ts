import { GoogleGenerativeAI } from "@google/generative-ai";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { updateOnChainSummary } from "./onchain";
import { getConnection } from "./config";
import fetch from "node-fetch";

const PROGRAM_ID = process.env.PROGRAM_ID;
const connection = getConnection();

// Upload the generated summary to Arweave via the Next.js API route
async function uploadToArweave(data: string): Promise<string> {
    const baseUrl = process.env.ARWEAVE_UPLOAD_URL ?? "http://localhost:3000";
    const fetchPromise = (async () => {
        const res = await fetch(`${baseUrl}/api/arweave/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: data,
                tags: [
                    { name: "Content-Type", value: "text/plain" },
                    { name: "Summary-For", value: "news-article" },
                    { name: "App-Name", value: "TradeTheNews" },
                ],
            }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Arweave upload failed ${res.status}: ${text}`);
        }
        const json: { success?: boolean; url?: string; error?: string } = await res.json();
        if (!json.success || !json.url) throw new Error(json.error ?? "Arweave upload returned no URL");
        return json.url;
    })();

    const timeoutPromise = new Promise<string>((_, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error("Arweave upload timed out"));
        }, 20000);
    });

    return Promise.race([fetchPromise, timeoutPromise]) as Promise<string>;
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

    // 3. Call the AI service (Gemini) to generate a summary
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = [
        "You are a helpful assistant that summarizes news articles.",
        "Please produce a concise 3-5 sentence summary with key facts and neutral tone.",
        "Article:",
        articleContent
    ].join("\n\n");
    const summaryResponse = await model.generateContent(prompt);
    const summary = summaryResponse.response.text();

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