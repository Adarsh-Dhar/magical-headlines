#!/usr/bin/env tsx

import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugOracle() {
  console.log("🔍 ORACLE DEBUGGING REPORT\n");
  console.log("=".repeat(60));
  
  // 1. Check environment variables
  console.log("\n1️⃣ Environment Variables:");
  console.log(`   MAGICBLOCK_RPC_URL: ${process.env.MAGICBLOCK_RPC_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   MAGICBLOCK_SESSION_KEYPAIR: ${process.env.MAGICBLOCK_SESSION_KEYPAIR ? '✅ Set' : '❌ Not set'}`);
  console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  
  // 2. Check database connection
  console.log("\n2️⃣ Database Status:");
  try {
    await prisma.$connect();
    console.log("   ✅ Database connected");
    
    // Get total tokens
    const totalTokens = await prisma.token.count();
    console.log(`   Total tokens: ${totalTokens}`);
    
    if (totalTokens === 0) {
      console.log("   ⚠️ No tokens in database!");
    } else {
      // Get sample tokens
      const tokens = await prisma.token.findMany({
        select: {
          id: true,
          volume24h: true,
          trendIndexScore: true,
          lastTrendUpdate: true,
          story: {
            select: {
              headline: true
            }
          }
        },
        take: 5
      });
      
      console.log("\n   Sample tokens:");
      tokens.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.story.headline.substring(0, 40)}...`);
        console.log(`      ID: ${t.id}`);
        console.log(`      Volume: ${t.volume24h}`);
        console.log(`      Trend Score: ${t.trendIndexScore || 'null'}`);
        console.log(`      Last Update: ${t.lastTrendUpdate || 'never'}`);
      });
    }
    
    // Check how many have trend scores
    const withTrendScores = await prisma.token.count({
      where: {
        trendIndexScore: { gt: 0 }
      }
    });
    console.log(`\n   Tokens with trend scores: ${withTrendScores}`);
    
    // Check how many have never been updated
    const neverUpdated = await prisma.token.count({
      where: {
        lastTrendUpdate: null
      }
    });
    console.log(`   Tokens never updated: ${neverUpdated}`);
    
    // Check tokens with volume
    const withVolume = await prisma.token.count({
      where: {
        volume24h: { gt: 0 }
      }
    });
    console.log(`   Tokens with volume: ${withVolume}`);
    
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }
  
  // 3. Check MagicBlock Oracle
  console.log("\n3️⃣ MagicBlock Oracle:");
  try {
    const { magicBlockAIOracle } = await import("./src/magicblock-ai-oracle");
    console.log("   ✅ Module loaded");
    
    // Check circuit breaker
    const circuitStatus = magicBlockAIOracle.getCircuitBreakerStatus();
    console.log(`   Circuit Breaker: ${circuitStatus.open ? '🔴 OPEN' : '🟢 CLOSED'}`);
    console.log(`   Failures: ${circuitStatus.failures}/${circuitStatus.threshold}`);
    
    // Check provider stats
    const stats = magicBlockAIOracle.getProviderStats();
    console.log(`   MagicBlock calls: ${stats.magicblock.calls}`);
    console.log(`   MagicBlock failures: ${stats.magicblock.failures}`);
    
  } catch (error) {
    console.log(`   ❌ Error loading MagicBlock Oracle: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Debug complete");
  
  await prisma.$disconnect();
}

debugOracle().catch(console.error);

