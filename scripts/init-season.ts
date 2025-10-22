import { Connection, PublicKey, Keypair } from "@solana/web3.js"
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor"
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json'

async function initializeFirstSeason() {
  const connection = new Connection("https://api.devnet.solana.com")
  
  // You'll need to provide your admin keypair here
  // For now, we'll generate a new one (you should replace this with your actual admin keypair)
  const adminKeypair = Keypair.generate()
  console.log("Generated admin keypair:", adminKeypair.publicKey.toString())
  console.log("Note: You should replace this with your actual admin keypair for production")
  
  const wallet = new Wallet(adminKeypair)
  const provider = new AnchorProvider(connection, wallet, {})
  const program = new Program(NEWS_PLATFORM_IDL as any, provider)
  
  try {
    // Fund the admin account with some SOL
    console.log("Funding admin account...")
    const airdropSignature = await connection.requestAirdrop(adminKeypair.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    await connection.confirmTransaction(airdropSignature)
    
    // Check balance
    const balance = await connection.getBalance(adminKeypair.publicKey)
    console.log("Admin account balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL")
    
    if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
      throw new Error("Insufficient balance for transaction")
    }
    
    // Try to find BN
    const BN = (anchor as any).BN || (anchor as any).default?.BN
    console.log("BN found:", BN)
    
    if (!BN) {
      throw new Error("BN not found in anchor module")
    }
    
    const seasonId = new BN(1)
    const seasonIdBuffer = seasonId.toArrayLike(Buffer, "le", 8)
    
    const signature = await program.methods
      .initializeSeason(seasonId)
      .accounts({
        season: PublicKey.findProgramAddressSync(
          [Buffer.from("season"), seasonIdBuffer],
          new PublicKey("CSNDjcoYr6iLwfsVC5xyc1SQeEJ2TbZV6vHrNyKDbGLQ")
        )[0],
        admin: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
    
    console.log("Season 1 initialized:", signature)
    console.log("Season PDA:", PublicKey.findProgramAddressSync(
      [Buffer.from("season"), seasonIdBuffer],
      new PublicKey("CSNDjcoYr6iLwfsVC5xyc1SQeEJ2TbZV6vHrNyKDbGLQ")
    )[0].toString())
  } catch (error) {
    console.error("Error initializing season:", error)
  }
}

initializeFirstSeason()
