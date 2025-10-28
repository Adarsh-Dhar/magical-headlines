import { Connection, PublicKey, Keypair } from "@solana/web3.js"
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor"
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json'
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function initializeFirstSeason() {
  const connection = new Connection("https://api.devnet.solana.com")
  
  // Load existing admin keypair from scripts/admin-keypair.json
  const secretKeyPath = resolve(process.cwd(), "scripts/admin-keypair.json")
  const secretKey = JSON.parse(readFileSync(secretKeyPath, "utf-8")) as number[]
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey))
  console.log("Using admin keypair:", adminKeypair.publicKey.toString())
  
  const wallet = new Wallet(adminKeypair)
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" })
  const program = new Program(NEWS_PLATFORM_IDL as any, provider)
  
  try {
    // Ensure DB season exists/updated to match requested season
    const seasonIdArg = process.argv[2] ? Number(process.argv[2]) : 1
    if (!Number.isInteger(seasonIdArg) || seasonIdArg < 1) throw new Error("Invalid season id")
    const now = new Date()
    const endTime = new Date(now.getTime() + 60 * 60 * 1000)
    const existingActive = await prisma.season.findFirst({ where: { isActive: true } })
    if (existingActive && existingActive.seasonId !== seasonIdArg) {
      await prisma.season.update({ where: { id: existingActive.id }, data: { isActive: false } })
    }
    const existingTarget = await prisma.season.findFirst({ where: { seasonId: seasonIdArg } })
    if (existingTarget) {
      await prisma.season.update({ where: { id: existingTarget.id }, data: { isActive: true, endTimestamp: endTime } })
      console.log(`DB season ${seasonIdArg} reactivated and extended 1h`)
    } else {
      await prisma.season.create({ data: { seasonId: seasonIdArg, startTimestamp: now, endTimestamp: endTime, isActive: true } })
      console.log(`DB season ${seasonIdArg} created and set active`)
    }
    const programId = program.programId as PublicKey
    const [oraclePda] = PublicKey.findProgramAddressSync([Buffer.from("oracle")], programId)

    // Ensure oracle account exists; if not, initialize it
    const oracleInfo = await connection.getAccountInfo(oraclePda)
    if (!oracleInfo) {
      console.log("Oracle account not found. Initializing oracle...")
      const sig = await program.methods
        .initializeOracle()
        .accounts({
          oracle: oraclePda,
          admin: adminKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()
      await connection.confirmTransaction(sig, "confirmed")
      console.log("Oracle initialized:", oraclePda.toString())
    } else {
      console.log("Oracle account exists:", oraclePda.toString())
    }
    // Optional: Check and log balance (no airdrop)
    const balance = await connection.getBalance(adminKeypair.publicKey)
    console.log("Admin account balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL")
    
    // Try to find BN
    const BN = (anchor as any).BN || (anchor as any).default?.BN
    console.log("BN found:", BN)
    
    if (!BN) {
      throw new Error("BN not found in anchor module")
    }
    
    const seasonId = new BN(seasonIdArg)
    const seasonIdBuffer = seasonId.toArrayLike(Buffer, "le", 8)
    
    const signature = await program.methods
      .initializeSeason(seasonId)
      .accounts({
        season: PublicKey.findProgramAddressSync([
          Buffer.from("season"),
          seasonIdBuffer,
        ], programId)[0],
        oracle: oraclePda,
        admin: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
    
    console.log("Season 1 initialized:", signature)
    console.log("Season PDA:", PublicKey.findProgramAddressSync(
      [Buffer.from("season"), seasonIdBuffer],
      programId
    )[0].toString())
  } catch (error) {
    console.error("Error initializing season:", error)
  } finally {
    try { await prisma.$disconnect() } catch {}
  }
}

initializeFirstSeason()
