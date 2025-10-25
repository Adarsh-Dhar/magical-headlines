import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

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
    const accountPubkey = new PublicKey(newsAccountPubkey);
    
    // Fetch raw account data
    const accountInfo = await connection.getAccountInfo(accountPubkey);
    if (!accountInfo) {
      return null;
    }
    
    // Parse the account data manually
    // This is a simplified parser - in production you'd want a more robust solution
    const data = accountInfo.data;
    
    // Skip discriminator (8 bytes)
    let offset = 8;
    
    // Read authority (32 bytes)
    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read headline length (4 bytes)
    const headlineLength = data.readUInt32LE(offset);
    offset += 4;
    
    // Read headline
    const headline = data.slice(offset, offset + headlineLength).toString('utf8');
    offset += headlineLength;
    
    // Read arweave link length (4 bytes)
    const arweaveLinkLength = data.readUInt32LE(offset);
    offset += 4;
    
    // Read arweave link
    const arweaveLink = data.slice(offset, offset + arweaveLinkLength).toString('utf8');
    offset += arweaveLinkLength;
    
    // Read summary link length (4 bytes)
    const summaryLinkLength = data.readUInt32LE(offset);
    offset += 4;
    
    // Read summary link
    const summaryLink = data.slice(offset, offset + summaryLinkLength).toString('utf8');
    offset += summaryLinkLength;
    
    // Read mint (32 bytes)
    const mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read publishedAt (8 bytes, i64)
    const publishedAt = data.readBigInt64LE(offset);
    offset += 8;
    
    // Read nonce (8 bytes, u64)
    const nonce = data.readBigUInt64LE(offset);
    offset += 8;
    
    return {
      headline,
      arweaveLink,
      summaryLink,
      publishedAt: Number(publishedAt),
      mint: mint.toString(),
      authority: authority.toString(),
      nonce: Number(nonce),
    };
  } catch (error) {
    // console.error("Failed to fetch news account:", error);
    return null;
  }
}

export async function fetchAllNewsAccounts(
  rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
): Promise<NewsAccountData[]> {
  try {
    const connection = new Connection(rpcUrl || "https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || "HEqdzibcMw3Sz43ZJbgQxGzgx7mCXtz6j85E7saJhbJ3");
    
    // Get all program derived accounts
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 200, // Approximate size of NewsAccount
        },
        {
          memcmp: {
            offset: 0,
            bytes: "afaf6d1f0d989bed", // NewsAccount discriminator
          },
        },
      ],
    });
    
    const newsAccounts: NewsAccountData[] = [];
    
    for (const account of accounts) {
      try {
        const data = account.account.data;
        
        // Skip discriminator (8 bytes)
        let offset = 8;
        
        // Read authority (32 bytes)
        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        // Read headline length (4 bytes)
        const headlineLength = data.readUInt32LE(offset);
        offset += 4;
        
        // Read headline
        const headline = data.slice(offset, offset + headlineLength).toString('utf8');
        offset += headlineLength;
        
        // Read arweave link length (4 bytes)
        const arweaveLinkLength = data.readUInt32LE(offset);
        offset += 4;
        
        // Read arweave link
        const arweaveLink = data.slice(offset, offset + arweaveLinkLength).toString('utf8');
        offset += arweaveLinkLength;
        
        // Read summary link length (4 bytes)
        const summaryLinkLength = data.readUInt32LE(offset);
        offset += 4;
        
        // Read summary link
        const summaryLink = data.slice(offset, offset + summaryLinkLength).toString('utf8');
        offset += summaryLinkLength;
        
        // Read mint (32 bytes)
        const mint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        // Read publishedAt (8 bytes, i64)
        const publishedAt = data.readBigInt64LE(offset);
        offset += 8;
        
        // Read nonce (8 bytes, u64)
        const nonce = data.readBigUInt64LE(offset);
        offset += 8;
        
        newsAccounts.push({
          headline,
          arweaveLink,
          summaryLink,
          publishedAt: Number(publishedAt),
          mint: mint.toString(),
          authority: authority.toString(),
          nonce: Number(nonce),
        });
      } catch (error) {
        // Skip invalid accounts
        // console.log("Skipping invalid account:", account.pubkey.toString());
      }
    }
    
    return newsAccounts;
  } catch (error) {
    // console.error("Failed to fetch all news accounts:", error);
    return [];
  }
}
