import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from 'fs';
import path from 'path';

// Import the IDL from the contract
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json';

// Program ID from the contract
const PROGRAM_ID = new PublicKey("HEqdzibcMw3Sz43ZJbgQxGzgx7mCXtz6j85E7saJhbJ3");

export interface PublishNewsParams {
  headline: string;
  arweaveLink: string;
  initialSupply: number;
  basePrice: number;
  nonce: number;
  authorAddress: string;
}

export interface PublishNewsResult {
  success: boolean;
  signature?: string;
  mintAccount?: string;
  marketAccount?: string;
  newsAccount?: string;
  error?: string;
}

class ServerContractService {
  private connection: Connection;
  private program: Program;
  private publisherKeypair: Keypair;

  constructor() {
    // Initialize connection
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );

    // Load publisher keypair
    this.publisherKeypair = this.loadPublisherKeypair();

    // Initialize program
    const provider = new AnchorProvider(
      this.connection,
      {
        publicKey: this.publisherKeypair.publicKey,
        signTransaction: async (tx) => {
          tx.sign(this.publisherKeypair);
          return tx;
        },
        signAllTransactions: async (txs) => {
          txs.forEach(tx => tx.sign(this.publisherKeypair));
          return txs;
        },
      },
      { commitment: "confirmed" }
    );

    this.program = new Program(NEWS_PLATFORM_IDL as Idl, provider);
  }

  private loadPublisherKeypair(): Keypair {
    try {
      // Try to load from environment variable first
      if (process.env.PUBLISHER_WALLET_KEYPAIR) {
        const keypairData = JSON.parse(process.env.PUBLISHER_WALLET_KEYPAIR);
        return Keypair.fromSecretKey(new Uint8Array(keypairData));
      }

      // Try to load from file
      const keypairPath = path.join(process.cwd(), 'publisher-keypair.json');
      if (fs.existsSync(keypairPath)) {
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        return Keypair.fromSecretKey(new Uint8Array(keypairData));
      }

      // Generate new keypair if none exists
      console.warn('No publisher keypair found, generating new one. This should only happen in development.');
      const newKeypair = Keypair.generate();
      
      // Save the new keypair for future use
      fs.writeFileSync(keypairPath, JSON.stringify(Array.from(newKeypair.secretKey)));
      console.log(`Generated new publisher keypair and saved to ${keypairPath}`);
      
      return newKeypair;
    } catch (error) {
      console.error('Error loading publisher keypair:', error);
      throw new Error('Failed to load publisher keypair');
    }
  }

  // Derive PDAs (Program Derived Addresses)
  private derivePDAs(authorAddress: string, nonce: number) {
    const author = new PublicKey(authorAddress);
    const nonceBN = new anchor.BN(nonce);

    // Derive news account PDA
    const [newsAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("news"), author.toBuffer(), nonceBN.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );

    // Derive mint account PDA
    const [mintAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), newsAccount.toBuffer()],
      this.program.programId
    );

    // Derive market account PDA
    const [marketAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), newsAccount.toBuffer()],
      this.program.programId
    );

    return {
      newsAccount,
      mintAccount,
      marketAccount
    };
  }

  // Main function to publish news on-chain
  async publishNewsOnChain(params: PublishNewsParams): Promise<PublishNewsResult> {
    try {
      console.log('🚀 Starting on-chain news publishing:', {
        headline: params.headline.substring(0, 50) + '...',
        authorAddress: params.authorAddress,
        nonce: params.nonce
      });

      // Validate inputs
      if (!params.headline || params.headline.length === 0 || params.headline.length > 200) {
        throw new Error('Invalid headline: must be 1-200 characters');
      }

      if (!params.arweaveLink || !params.arweaveLink.startsWith('https://arweave.net/')) {
        throw new Error('Invalid Arweave link: must start with https://arweave.net/');
      }

      if (params.initialSupply <= 0 || params.initialSupply > 10000) {
        throw new Error('Invalid initial supply: must be 1-10000');
      }

      if (params.basePrice <= 0 || params.basePrice > 1000000000) {
        throw new Error('Invalid base price: must be 1-1000000000 lamports');
      }

      // Derive PDAs
      const { newsAccount, mintAccount, marketAccount } = this.derivePDAs(params.authorAddress, params.nonce);

      // Check if news account already exists
      const existingNewsAccount = await this.connection.getAccountInfo(newsAccount);
      if (existingNewsAccount) {
        throw new Error('News account already exists with this nonce');
      }

      // Create author token account address
      const authorTokenAccount = await anchor.utils.token.associatedAddress({
        mint: mintAccount,
        owner: new PublicKey(params.authorAddress),
      });

      // Build the transaction
      const tx = await this.program.methods
        .publishNews(
          params.headline,
          params.arweaveLink,
          new anchor.BN(params.initialSupply),
          new anchor.BN(params.basePrice),
          new anchor.BN(params.nonce)
        )
        .accounts({
          newsAccount,
          mint: mintAccount,
          author: new PublicKey(params.authorAddress),
          authorTokenAccount,
          market: marketAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .transaction();

      // Set recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.publisherKeypair.publicKey;

      // Sign and send transaction
      tx.sign(this.publisherKeypair);
      
      console.log('📝 Sending transaction...');
      const signature = await this.connection.sendTransaction(tx, [this.publisherKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('⏳ Waiting for confirmation...');
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      console.log('✅ Transaction confirmed:', signature);

      return {
        success: true,
        signature,
        mintAccount: mintAccount.toString(),
        marketAccount: marketAccount.toString(),
        newsAccount: newsAccount.toString(),
      };

    } catch (error) {
      console.error('❌ Error publishing news on-chain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Get account info for verification
  async getAccountInfo(accountAddress: string) {
    try {
      const account = await this.connection.getAccountInfo(new PublicKey(accountAddress));
      return account;
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  // Check if publisher has enough SOL for transactions
  async checkPublisherBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.publisherKeypair.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error checking publisher balance:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const serverContractService = new ServerContractService();
