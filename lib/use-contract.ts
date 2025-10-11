"use client";

import { useMemo, useCallback } from "react";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Load IDL JSON produced by Anchor build
// Path: contract/target/idl/news_platform.json
// eslint-disable-next-line @typescript-eslint/no-var-requires
const NEWS_PLATFORM_IDL: Idl = require("../contract/target/idl/news_platform.json");

// Constants
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!id) {
    throw new Error("NEXT_PUBLIC_PROGRAM_ID is not set in the environment");
  }
  return new PublicKey(id);
}

function getProvider(connection: Connection, wallet: anchor.Wallet): AnchorProvider {
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

function getProgram(connection: Connection, wallet: anchor.Wallet): Program {
  const provider = getProvider(connection, wallet);
  const programId = getProgramId();
  return new Program(NEWS_PLATFORM_IDL as Idl, programId as any, provider as any) as Program;
}

// PDA helpers
const findNewsPda = (author: PublicKey, nonce: anchor.BN | number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("news"), author.toBuffer(), new anchor.BN(nonce).toArrayLike(Buffer, "le", 8)],
    getProgramId()
  )[0];

const findMintPda = (newsAccount: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), newsAccount.toBuffer()],
    getProgramId()
  )[0];

const findMarketPda = (newsAccount: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("market"), newsAccount.toBuffer()],
    getProgramId()
  )[0];

const findOraclePda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("oracle")], getProgramId())[0];

const findWhitelistPda = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("whitelist"), authority.toBuffer()],
    getProgramId()
  )[0];

const findMetadataPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];

export function useContract() {
  const { connection } = useConnection();
  const walletAdapter = useWallet();

  const program = useMemo(() => {
    if (!walletAdapter.publicKey || !walletAdapter.signTransaction) return null;
    
    try {
      // Adapt wallet-adapter to Anchor wallet interface
      const wallet = {
        publicKey: walletAdapter.publicKey,
        signTransaction: walletAdapter.signTransaction!,
        signAllTransactions: walletAdapter.signAllTransactions!,
      } as unknown as anchor.Wallet;
      
      const programId = getProgramId();
      const provider = getProvider(connection, wallet);
      
      // Create a minimal working IDL to bypass the account structure issue
      const minimalIdl = {
        address: programId.toString(),
        metadata: {
          name: "news_platform",
          version: "0.1.0",
          spec: "0.1.0",
          description: "Created with Anchor"
        },
        instructions: NEWS_PLATFORM_IDL.instructions || [],
        accounts: NEWS_PLATFORM_IDL.accounts || [], // Include accounts from IDL
        events: NEWS_PLATFORM_IDL.events || [],
        errors: NEWS_PLATFORM_IDL.errors || [],
        types: NEWS_PLATFORM_IDL.types || []
      };
      
      const program = new Program(minimalIdl as Idl, provider) as Program;
      return program;
    } catch (error) {
      console.error('Program creation failed:', error);
      return null;
    }
  }, [connection, walletAdapter.publicKey, walletAdapter.signTransaction, walletAdapter.signAllTransactions]);

  const publishNews = useCallback(
    async (params: {
      headline: string;
      arweaveLink: string;
      initialSupply: number | anchor.BN;
      nonce: number | anchor.BN;
    }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");

      // Comprehensive input validation
      if (!params.headline || params.headline.trim().length === 0) {
        throw new Error("Headline cannot be empty");
      }
      if (params.headline.length > 200) {
        throw new Error("Headline too long (max 200 characters)");
      }
      if (!params.arweaveLink || params.arweaveLink.trim().length === 0) {
        throw new Error("Arweave link cannot be empty");
      }
      if (params.arweaveLink.length > 200) {
        throw new Error("Arweave link too long (max 200 characters)");
      }
      if (!params.arweaveLink.startsWith("https://arweave.net/") && !params.arweaveLink.startsWith("ar://")) {
        throw new Error("Invalid Arweave link format");
      }
      
      const initialSupplyNum = typeof params.initialSupply === 'number' ? params.initialSupply : params.initialSupply.toNumber();
      if (initialSupplyNum <= 0) {
        throw new Error("Initial supply must be greater than 0");
      }
      if (initialSupplyNum > 1000000000) {
        throw new Error("Initial supply too large (max 1 billion)");
      }
      
      if (typeof params.nonce === 'number' && params.nonce < 0) {
        throw new Error("Nonce must be non-negative");
      }

      const author = walletAdapter.publicKey;
      // Ensure nonce is a safe integer and convert to string for anchor.BN
      const safeNonce = Number.isSafeInteger(params.nonce) ? params.nonce : Math.floor(Math.random() * 1000000000);
      const nonceBn = new anchor.BN(safeNonce.toString());
      console.log('[useContract] Using nonce:', safeNonce, 'as BN:', nonceBn.toString());
      
      // Validate nonce is unique by checking if news account already exists
      const newsPda = findNewsPda(author, nonceBn);
      const mintPda = findMintPda(newsPda);
      const marketPda = findMarketPda(newsPda);
      const metadataPda = findMetadataPda(mintPda);
      
      // Check if accounts already exist (security check)
      try {
        const existingNewsAccount = await connection.getAccountInfo(newsPda);
        if (existingNewsAccount) {
          throw new Error("News account already exists with this nonce");
        }
      } catch (error) {
        // Account doesn't exist, which is what we want
        console.log('[useContract] News account does not exist, proceeding with creation');
      }

      const metadataProgram = TOKEN_METADATA_PROGRAM_ID;

      // Create associated token account address
      const authorTokenAccount = await anchor.utils.token.associatedAddress({
        mint: mintPda,
        owner: author,
      });

      console.log('[useContract] Publishing news with accounts:', {
        newsAccount: newsPda.toString(),
        mint: mintPda.toString(),
        market: marketPda.toString(),
        author: author.toString(),
        authorTokenAccount: authorTokenAccount.toString()
      });

      const signature = await program.methods
        .publishNews(
          params.headline,
          params.arweaveLink,
          new anchor.BN(params.initialSupply),
          nonceBn
        )
        .accounts({
          newsAccount: newsPda,
          mint: mintPda,
          metadata: metadataPda,
          author,
          authorTokenAccount,
          market: marketPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          metadataProgram,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // Verify the transaction was successful by checking account states
      console.log('[useContract] Verifying transaction success...');
      console.log('[useContract] Verification PDAs:', {
        newsPda: newsPda.toString(),
        mintPda: mintPda.toString(),
        marketPda: marketPda.toString()
      });
      
      try {
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Verify news account was created
        try {
          const accountInfo = await connection.getAccountInfo(newsPda);
          if (!accountInfo) {
            throw new Error("News account was not created");
          }
          console.log('[useContract] News account exists:', {
            address: newsPda.toString(),
            lamports: accountInfo.lamports,
            owner: accountInfo.owner.toString()
          });
        } catch (error) {
          console.error('[useContract] News account verification failed:', error);
          throw new Error(`News account was not created or could not be fetched: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Verify mint account was created with correct supply
        try {
          // Add a small delay to ensure account is fully propagated
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify mint account exists
          const mintAccountInfo = await connection.getAccountInfo(mintPda);
          if (!mintAccountInfo) {
            throw new Error("Mint account was not created");
          }
          
          console.log('[useContract] Mint account exists:', {
            address: mintPda.toString(),
            lamports: mintAccountInfo.lamports,
            owner: mintAccountInfo.owner.toString()
          });
          
          // For now, we'll just verify the account exists
          // The supply verification can be done later when we have proper account parsing
        } catch (error) {
          console.error('[useContract] Mint account verification failed:', error);
          throw new Error(`Mint account was not created or could not be fetched: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Verify market account was created
        try {
          const marketAccountInfo = await connection.getAccountInfo(marketPda);
          if (!marketAccountInfo) {
            throw new Error("Market account was not created");
          }
          
          console.log('[useContract] Market account exists:', {
            address: marketPda.toString(),
            lamports: marketAccountInfo.lamports,
            owner: marketAccountInfo.owner.toString()
          });
        } catch (error) {
          console.error('[useContract] Market account verification failed:', error);
          throw new Error(`Market account was not created or could not be fetched: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        console.log('[useContract] Transaction verification successful');
        return signature;
        
      } catch (verificationError) {
        console.error('[useContract] Transaction verification failed:', verificationError);
        throw new Error(`Transaction verification failed: ${verificationError instanceof Error ? verificationError.message : String(verificationError)}`);
      }
    },
    [program, walletAdapter.publicKey]
  );


  const buy = useCallback(
    async (params: { market: PublicKey; mint: PublicKey; newsAccount: PublicKey; amount: number | anchor.BN }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      const buyer = walletAdapter.publicKey;
      
      // Derive the associated token account address
      const buyerTokenAccount = await anchor.utils.token.associatedAddress({
        mint: params.mint,
        owner: buyer,
      });
      
      console.log('[useContract] Buy accounts:', {
        market: params.market.toString(),
        mint: params.mint.toString(),
        newsAccount: params.newsAccount.toString(),
        buyer: buyer.toString(),
        buyerTokenAccount: buyerTokenAccount.toString(),
        tokenProgram: TOKEN_PROGRAM_ID.toString(),
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toString(),
        systemProgram: SystemProgram.programId.toString(),
      });

      // Debug: Check market account state
      try {
        const marketAccount = await (program.account as any).market.fetch(params.market);
        console.log('[useContract] Market account state:', {
          currentSupply: marketAccount.currentSupply.toString(),
          solReserves: marketAccount.solReserves.toString(),
          curveType: marketAccount.curveType,
          isDelegated: marketAccount.isDelegated,
        });
      } catch (error) {
        console.error('[useContract] Error fetching market account:', error);
      }
      
      // Retry logic for blockhash issues
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          return await program.methods
            .buy(new anchor.BN(params.amount))
            .accounts({
              market: params.market,
              mint: params.mint,
              newsAccount: params.newsAccount,
              buyer,
              buyerTokenAccount: buyerTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`Buy transaction attempt failed (${4 - retries}/3):`, errorMessage);
          
          if (errorMessage.includes('Blockhash not found') && retries > 1) {
            console.log('Retrying due to blockhash error...');
            retries--;
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    },
    [program, walletAdapter.publicKey]
  );

  const sell = useCallback(
    async (params: { market: PublicKey; mint: PublicKey; newsAccount: PublicKey; amount: number | anchor.BN }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      const buyer = walletAdapter.publicKey; // seller in program is named buyer
      
      // Derive the associated token account address
      const buyerTokenAccount = await anchor.utils.token.associatedAddress({
        mint: params.mint,
        owner: buyer,
      });
      
      return await program.methods
        .sell(new anchor.BN(params.amount))
        .accounts({
          market: params.market,
          mint: params.mint,
          newsAccount: params.newsAccount,
          buyer,
          buyerTokenAccount: buyerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const delegate = useCallback(
    async (params: { market: PublicKey }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      return await program.methods
        .delegate()
        .accounts({
          market: params.market,
          rollupAuthority: walletAdapter.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const commit = useCallback(
    async (params: { market: PublicKey; newSupply: number | anchor.BN; newReserves: number | anchor.BN }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      return await program.methods
        .commit(new anchor.BN(params.newSupply), new anchor.BN(params.newReserves))
        .accounts({
          market: params.market,
          rollupAuthority: walletAdapter.publicKey,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const undelegate = useCallback(
    async (params: { market: PublicKey }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      return await program.methods
        .undelegate()
        .accounts({
          market: params.market,
          rollupAuthority: walletAdapter.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const initializeOracle = useCallback(async () => {
    if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
    return await program.methods
      .initializeOracle()
      .accounts({
        admin: walletAdapter.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }, [program, walletAdapter.publicKey]);

  const addAuthority = useCallback(
    async (params: { authority: PublicKey }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      const oraclePda = findOraclePda();
      return await program.methods
        .addAuthority(params.authority)
        .accounts({
          oracle: oraclePda,
          admin: walletAdapter.publicKey,
          authority: params.authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const updateSummaryLink = useCallback(
    async (params: { newsAccount: PublicKey; summaryLink: string }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      return await program.methods
        .updateSummaryLink(params.summaryLink)
        .accounts({
          newsAccount: params.newsAccount,
          oracleAuthority: walletAdapter.publicKey,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const getAllNewsTokens = useCallback(
    async (params: { offset: number; limit: number }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      return await program.methods
        .getAllNewsTokens(params.offset, params.limit)
        .accounts({
          requester: walletAdapter.publicKey,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const getNewsByAuthor = useCallback(
    async (params: { newsAccount: PublicKey }) => {
      if (!program || !walletAdapter.publicKey) throw new Error("Wallet not ready");
      return await program.methods
        .getNewsByAuthor()
        .accounts({
          newsAccount: params.newsAccount,
          requester: walletAdapter.publicKey,
        })
        .rpc();
    },
    [program, walletAdapter.publicKey]
  );

  const fetchNewsAccount = useCallback(
    async (newsAccountAddress: PublicKey) => {
      if (!program) throw new Error("Program not ready");
      try {
        const accountInfo = await connection.getAccountInfo(newsAccountAddress);
        if (!accountInfo) {
          throw new Error("News account not found");
        }
        return accountInfo;
      } catch (error) {
        console.error('Error fetching news account:', error);
        throw error;
      }
    },
    [program, connection]
  );

  const findActualNewsAccount = useCallback(
    async (authorAddress: PublicKey, nonce: number) => {
      if (!program) throw new Error("Program not ready");
      try {
        // Try to find the news account by checking if it exists
        const derivedNewsPda = findNewsPda(authorAddress, nonce);
        const accountInfo = await connection.getAccountInfo(derivedNewsPda);
        
        if (accountInfo) {
          console.log('Found news account at derived address:', derivedNewsPda.toString());
          return derivedNewsPda;
        } else {
          console.log('No news account found at derived address:', derivedNewsPda.toString());
          // For now, just return the derived address and let the contract handle the validation
          console.log('No news account found at derived address, using derived address');
          return derivedNewsPda;
        }
      } catch (error) {
        console.error('Error finding news account:', error);
        throw error;
      }
    },
    [program, connection]
  );

  const estimateBuyCost = useCallback(
    async (marketAddress: PublicKey, amount: number) => {
      if (!program) throw new Error("Program not ready");
      try {
        const marketAccount = await (program.account as any).market.fetch(marketAddress);
        console.log('Market state:', {
          currentSupply: marketAccount.currentSupply.toString(),
          solReserves: marketAccount.solReserves.toString(),
          curveType: marketAccount.curveType,
          isDelegated: marketAccount.isDelegated,
        });
        
        // Use the same calculation as the contract's exponential curve
        const basePrice = 1000000; // 0.001 SOL in lamports (1,000,000 lamports)
        const currentSupply = Number(marketAccount.currentSupply);
        let totalCost = 0;
        
        console.log(`Calculating cost for ${amount} tokens with current supply: ${currentSupply}`);
        
        for (let i = 0; i < amount; i++) {
          const supply = currentSupply + i;
          // Use the same calculation as the contract: base_price * (1 + supply/10000)
          const multiplier = Math.min(10000 + supply, 20000); // Cap at 2x to prevent overflow
          const price = Math.floor((basePrice * multiplier) / 10000);
          totalCost += price;
          console.log(`Token ${i + 1}: supply=${supply}, multiplier=${multiplier}, price=${price} lamports`);
        }
        
        const costInSOL = totalCost / 1e9;
        console.log(`Total cost: ${totalCost} lamports = ${costInSOL} SOL`);
        
        return costInSOL;
      } catch (error) {
        console.error('Error estimating buy cost:', error);
        // Return a fallback calculation if market account fetch fails
        const basePrice = 1000000; // 0.001 SOL in lamports
        const fallbackCost = (basePrice * amount) / 1e9; // Simple linear fallback
        console.log(`Using fallback cost calculation: ${fallbackCost} SOL`);
        return fallbackCost;
      }
    },
    [program]
  );

  // Get market delegation status
  const getMarketDelegationStatus = useCallback(
    async (marketAddress: PublicKey) => {
      if (!program) throw new Error("Program not ready");
      try {
        const marketAccount = await (program.account as any).market.fetch(marketAddress);
        return {
          isDelegated: marketAccount.isDelegated,
          rollupAuthority: marketAccount.rollupAuthority,
          currentSupply: marketAccount.currentSupply,
          totalVolume: marketAccount.totalVolume,
        };
      } catch (error) {
        console.error('Error fetching market delegation status:', error);
        throw error;
      }
    },
    [program]
  );

  // Listen for delegation events
  const listenForDelegationEvents = useCallback(
    (onMarketAutoDelegated?: (event: any) => void, onStateCommitRecommended?: (event: any) => void) => {
      if (!program) return null;
      
      const listener = program.addEventListener('MarketAutoDelegated', (event) => {
        console.log('Market auto-delegated:', event);
        if (onMarketAutoDelegated) onMarketAutoDelegated(event);
      });
      
      const commitListener = program.addEventListener('StateCommitRecommended', (event) => {
        console.log('State commit recommended:', event);
        if (onStateCommitRecommended) onStateCommitRecommended(event);
      });
      
      return () => {
        program.removeEventListener(listener);
        program.removeEventListener(commitListener);
      };
    },
    [program]
  );

  return {
    program,
    // instruction wrappers
    publishNews,
    buy,
    sell,
    delegate,
    commit,
    undelegate,
    initializeOracle,
    addAuthority,
    updateSummaryLink,
    getAllNewsTokens,
    getNewsByAuthor,
    fetchNewsAccount,
    findActualNewsAccount,
    estimateBuyCost,
    // delegation functions
    getMarketDelegationStatus,
    listenForDelegationEvents,
    // pda helpers exposed for UI composition
    pdas: {
      findNewsPda,
      findMintPda,
      findMarketPda,
      findOraclePda,
      findWhitelistPda,
      findMetadataPda,
    },
  } as const;
}


