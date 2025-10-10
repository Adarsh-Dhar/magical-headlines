"use client";

import { useEffect } from "react";
import { NewsFeed } from "@/components/news-feed"
import { TrendingStories } from "@/components/trending-stories"
import { MarketStats } from "@/components/market-stats"
import { UserInfoLogger } from "@/components/user-info-logger"
import { useContract } from "@/lib/use-contract"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

export default function HomePage() {
  const { program } = useContract();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const fetchNewsTokens = async () => {
      if (!connected || !publicKey || !program) {
        console.log("Wallet not connected or program not ready, skipping news tokens fetch");
        return;
      }

      try {
        console.log("Fetching all news tokens...");
        
        // Check if program and account namespace exist
        if (!program || !program.account) {
          console.error("Program or account namespace not available");
          return;
        }
        
        // Try to access newsAccount with proper error handling
        const newsAccountNamespace = (program.account as any).newsAccount;
        if (!newsAccountNamespace || typeof newsAccountNamespace.all !== 'function') {
          console.error("newsAccount namespace not available or all method not found");
          console.log("Available account types:", Object.keys(program.account || {}));
          return;
        }
        
        // Fetch all news accounts from the blockchain
        const accounts = await newsAccountNamespace.all();
        console.log("News tokens accounts:", accounts);
        console.log(`Found ${accounts.length} news accounts`);
        
        // Log each account's data
        accounts.forEach((account: any, index: number) => {
          console.log(`Account ${index + 1}:`, {
            publicKey: account.publicKey.toString(),
            headline: account.account.headline,
            author: account.account.authority.toString(),
            arweaveLink: account.account.arweaveLink,
            summaryLink: account.account.summaryLink,
            mint: account.account.mint.toString(),
            publishedAt: new Date(account.account.publishedAt * 1000).toISOString(),
            bump: account.account.bump,
          });
        });
        
      } catch (error) {
        console.error("Error fetching news tokens:", error);
        console.log("Program object:", program);
        console.log("Program account namespace:", program?.account);
      }
    };

    fetchNewsTokens();
  }, [connected, publicKey, program]);

  return (
    <div className="min-h-screen bg-background">
      <UserInfoLogger />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-balance">Trade the News</h1>
          <p className="text-lg text-muted-foreground text-balance">
            Where breaking news becomes tradable assets. Speculate on attention, profit from trends.
          </p>
        </div>

        <MarketStats />

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <NewsFeed />
          </div>
          <div>
            <TrendingStories />
          </div>
        </div>
      </div>
    </div>
  )
}
