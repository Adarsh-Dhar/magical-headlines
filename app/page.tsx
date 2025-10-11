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
        return;
      }

      try {
        
        // Check if program and account namespace exist
        if (!program || !program.account) {
          return;
        }
        
        // Try to access newsAccount with proper error handling
        const newsAccountNamespace = (program.account as any).newsAccount;
        if (!newsAccountNamespace || typeof newsAccountNamespace.all !== 'function') {
          return;
        }
        
        // Fetch all news accounts from the blockchain
        const accounts = await newsAccountNamespace.all();
        
        
      } catch (error) {
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
