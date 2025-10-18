import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import IDL from "../contract1/target/idl/news_platform.json";
import type { NewsPlatform } from "../contract1/target/types/news_platform";

export interface NewsAccountData {
  headline: string;
  arweaveLink: string;
  summaryLink: string;
  publishedAt: number;
  mint: string;
  authority: string;
  nonce: number;
}

export async function fetchNewsAccount(
  newsAccountPubkey: string, 
  rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
): Promise<NewsAccountData | null> {
  try {
    const connection = new Connection(rpcUrl || "https://api.devnet.solana.com", "confirmed");
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // read-only
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);
    
    const pubkey = new PublicKey(newsAccountPubkey);
    const account = await program.account.newsAccount.fetch(pubkey);
    
    return {
      headline: account.headline,
      arweaveLink: account.arweaveLink,
      summaryLink: account.summaryLink,
      publishedAt: Number(account.publishedAt),
      mint: account.mint.toBase58(),
      authority: account.authority.toBase58(),
      nonce: Number(account.nonce),
    };
  } catch (error) {
    console.error("Failed to fetch news account:", error);
    return null;
  }
}

export async function fetchAllNewsAccounts(
  rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
): Promise<NewsAccountData[]> {
  try {
    const connection = new Connection(rpcUrl || "https://api.devnet.solana.com", "confirmed");
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate()); // read-only
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program<NewsPlatform>(IDL as any, provider);
    
    const accounts = await program.account.newsAccount.all();
    
    return accounts.map(account => ({
      headline: account.account.headline,
      arweaveLink: account.account.arweaveLink,
      summaryLink: account.account.summaryLink,
      publishedAt: Number(account.account.publishedAt),
      mint: account.account.mint.toBase58(),
      authority: account.account.authority.toBase58(),
      nonce: Number(account.account.nonce),
    }));
  } catch (error) {
    console.error("Failed to fetch all news accounts:", error);
    return [];
  }
}
