import { NextRequest, NextResponse } from "next/server"
import { Connection, PublicKey } from "@solana/web3.js"
import { Program, AnchorProvider } from "@coral-xyz/anchor"
import { prisma } from "@/lib/prisma"
import NEWS_PLATFORM_IDL from '../../../contract/target/idl/news_platform.json'

const getProgramId = () => new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "CSNDjcoYr6iLwfsVC5xyc1SQeEJ2TbZV6vHrNyKDbGLQ"
)

const findProfilePda = (user: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), user.toBuffer()],
    getProgramId()
  )[0]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userAddress = searchParams.get("userAddress")
  
  if (!userAddress) {
    return NextResponse.json({ error: "User address required" }, { status: 400 })
  }
  
  try {
    // Fetch from database (off-chain cache)
    const profile = await prisma.profile.findUnique({
      where: { userAddress },
      include: {
        user: true,
        seasonStats: {
          include: { season: true },
          orderBy: { season: { seasonId: 'desc' } },
          take: 10
        }
      }
    })
    
    // Sync with on-chain data
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"
    )
    
    try {
      const userPubkey = new PublicKey(userAddress)
      const profilePda = findProfilePda(userPubkey)
      
      const wallet = { publicKey: userPubkey } as any
      const provider = new AnchorProvider(connection, wallet, {})
      const program = new Program(NEWS_PLATFORM_IDL as any, provider)
      
      const onchainProfile = await program.account.profile.fetch(profilePda)
      
      // Update database with on-chain data
      if (profile) {
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            totalPnl: Number(onchainProfile.totalPnl) / 1e9,
            totalVolume: Number(onchainProfile.totalVolume) / 1e9,
            tradesCount: Number(onchainProfile.tradesCount),
            wins: Number(onchainProfile.wins),
            trophies: Number(onchainProfile.trophies),
            currentSeasonPnl: Number(onchainProfile.currentSeasonPnl) / 1e9,
            lastTradeTimestamp: new Date(Number(onchainProfile.lastTradeTimestamp) * 1000),
          }
        })
      }
    } catch (error) {
      // On-chain profile doesn't exist yet, use database data
    }
    
    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json()
    
    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 })
    }
    
    console.log("Creating profile for user:", userAddress)
    
    // First ensure user exists
    const user = await prisma.user.upsert({
      where: { walletAddress: userAddress },
      create: { walletAddress: userAddress },
      update: {}
    })
    
    const profile = await prisma.profile.create({
      data: {
        userAddress,
        totalPnl: 0,
        totalVolume: 0,
        tradesCount: 0,
        wins: 0,
        trophies: 0,
        currentSeasonPnl: 0
      }
    })
    
    console.log("Profile created successfully:", profile.id)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error creating profile:", error)
    return NextResponse.json({ 
      error: "Failed to create profile", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
