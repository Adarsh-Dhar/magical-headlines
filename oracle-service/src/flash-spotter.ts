import { FlashTrendDetector } from "./flash-trend-detector";
import { PrismaClient } from "@prisma/client";
import { getConnection, getProgramId, getWallet } from "./config";
import * as anchor from "@coral-xyz/anchor";
import { NewsPlatform } from "../../contract/target/types/news_platform";
import IDL from "../../contract/target/idl/news_platform.json";
import { emitNotification } from "../../lib/notification-bus";

const prisma = new PrismaClient();

export class FlashMarketSpotter {
  private detector = new FlashTrendDetector();
  private isRunning = false;
  private program: anchor.Program<NewsPlatform>;
  
  constructor() {
    const connection = getConnection();
    const wallet = getWallet();
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    this.program = new anchor.Program<NewsPlatform>(IDL as any, provider);
  }
  
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log("🔍 Flash Market Spotter started");
    
    // Check every 2 seconds for velocity spikes
    setInterval(() => this.scanForSpikes(), 2000);
    
    // Resolve expired markets every 5 seconds
    setInterval(() => this.resolveExpiredMarkets(), 5000);
  }
  
  private async scanForSpikes() {
    try {
      const trending = await prisma.token.findMany({
        where: { trendIndexScore: { gt: 30 } },
        orderBy: { trendVelocity: 'desc' },
        take: 20,
      });
      
      for (const token of trending) {
        const { detected, velocity } = await this.detector.detectVelocitySpike(token.id);
        
        if (detected) {
          await this.createFlashMarket(token.id, velocity);
        }
      }
    } catch (error) {
      console.error("Error scanning for spikes:", error);
    }
  }
  
  private async createFlashMarket(tokenId: string, velocity: number) {
    try {
      // Create in database
      const flashMarket = await this.detector.createFlashMarket(tokenId, velocity);
      
      // Create on-chain
      const token = await prisma.token.findUnique({ where: { id: tokenId } });
      if (!token?.newsAccount) return;
      
      const newsAccountPubkey = new anchor.web3.PublicKey(token.newsAccount);
      const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("market"), newsAccountPubkey.toBuffer()],
        this.program.programId
      );
      
      const velocityScaled = Math.floor(velocity * 1000);
      
      const [whitelistPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), this.program.provider.publicKey.toBuffer()],
        this.program.programId
      );
      
      await this.program.methods
        .createFlashMarket(new anchor.BN(velocityScaled), new anchor.BN(60))
        .accounts({
          market: marketPda,
          newsAccount: newsAccountPubkey,
          whitelist: whitelistPda,
          oracleAuthority: this.program.provider.publicKey,
        } as any)
        .rpc();
      
      // Broadcast to all users
      emitNotification('broadcast', {
        type: 'FLASH_MARKET_CREATED',
        marketId: flashMarket.id,
        tokenId,
        velocity,
        endTime: flashMarket.endTimestamp,
      });
      
      console.log(`⚡ Flash market created for token ${tokenId}`);
    } catch (error) {
      console.error("Error creating flash market:", error);
    }
  }
  
  private async resolveExpiredMarkets() {
    try {
      const expired = await prisma.flashTrendMarket.findMany({
        where: {
          isActive: true,
          isResolved: false,
          endTimestamp: { lte: new Date() },
        },
      });
      
      for (const market of expired) {
        await this.resolveMarket(market);
      }
    } catch (error) {
      console.error("Error resolving markets:", error);
    }
  }
  
  private async resolveMarket(market: any) {
    try {
      // Get final velocity
      const history = await prisma.trendIndexHistory.findMany({
        where: { tokenId: market.parentTokenId },
        orderBy: { timestamp: 'desc' },
        take: 2,
      });
      
      if (history.length < 2) return;
      
      const timeDiff = (history[0].timestamp.getTime() - history[1].timestamp.getTime()) / 1000;
      const scoreDiff = history[0].score - history[1].score;
      const finalVelocity = timeDiff > 0 ? scoreDiff / timeDiff : 0;
      
      // Determine winner
      const velocityChange = finalVelocity - market.initialVelocity;
      const winningSide = velocityChange >= 0 ? 'up' : 'down';
      
      // Calculate payouts (proportional based on accuracy)
      await this.calculatePayouts(market.id, winningSide, Math.abs(velocityChange));
      
      // Update market
      await prisma.flashTrendMarket.update({
        where: { id: market.id },
        data: {
          isActive: false,
          isResolved: true,
          finalVelocity,
          winningSide,
        },
      });
      
      // Close on-chain
      const token = await prisma.token.findUnique({
        where: { id: market.parentTokenId }
      });
      
      if (token?.newsAccount) {
        const newsAccountPubkey = new anchor.web3.PublicKey(token.newsAccount);
        const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("market"), newsAccountPubkey.toBuffer()],
          this.program.programId
        );
        
        const [whitelistPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("whitelist"), this.program.provider.publicKey.toBuffer()],
          this.program.programId
        );
        
        await this.program.methods
          .closeFlashMarket(new anchor.BN(Math.floor(finalVelocity * 1000)))
          .accounts({
            market: marketPda,
            newsAccount: newsAccountPubkey,
            whitelist: whitelistPda,
            oracleAuthority: this.program.provider.publicKey,
          } as any)
          .rpc();
      }
      
      console.log(`✅ Flash market ${market.id} resolved: ${winningSide}`);
    } catch (error) {
      console.error("Error resolving market:", error);
    }
  }
  
  private async calculatePayouts(marketId: string, winningSide: string, magnitude: number) {
    const positions = await prisma.flashTrendPosition.findMany({
      where: { marketId, isResolved: false },
    });
    
    const winners = positions.filter(p => p.direction === winningSide);
    const losers = positions.filter(p => p.direction !== winningSide);
    
    const totalWinAmount = winners.reduce((sum, p) => sum + p.amount, 0);
    const totalLoseAmount = losers.reduce((sum, p) => sum + p.amount, 0);
    
    // Proportional payout based on bet size
    for (const winner of winners) {
      const share = totalWinAmount > 0 ? winner.amount / totalWinAmount : 0;
      const payout = winner.amount + (totalLoseAmount * share);
      const profitLoss = payout - winner.amount;
      
      await prisma.flashTrendPosition.update({
        where: { id: winner.id },
        data: {
          isResolved: true,
          payout,
          profitLoss,
        },
      });
    }
    
    // Losers get nothing
    for (const loser of losers) {
      await prisma.flashTrendPosition.update({
        where: { id: loser.id },
        data: {
          isResolved: true,
          payout: 0,
          profitLoss: -loser.amount,
        },
      });
    }
  }
}

