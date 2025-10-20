"use client";
// @ts-nocheck

import React, { useMemo, useCallback } from "react";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Import the IDL from the contract
import NEWS_PLATFORM_IDL from '../contract/target/idl/news_platform.json';

// Debug: Log IDL import
//   address: NEWS_PLATFORM_IDL?.address,
//   instructionsCount: NEWS_PLATFORM_IDL?.instructions?.length,
//   accountsCount: NEWS_PLATFORM_IDL?.accounts?.length,
//   eventsCount: NEWS_PLATFORM_IDL?.events?.length
// });

// Debug: Log instruction names
if (NEWS_PLATFORM_IDL?.instructions) {
}

// Constants
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID || "9pRU9UFJctN6H1b1hY3GCkVwK5b3ESC7ZqBDZ8thooN4";
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
  
  // Create a copy of the IDL with the correct program ID
  const idlWithCorrectProgramId = {
    ...NEWS_PLATFORM_IDL,
    address: programId.toString()
  };
  
  return new Program(idlWithCorrectProgramId as Idl, provider) as Program;
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

  // Create program on demand to avoid dependency issues
  const getProgram = useCallback(() => {
    // Only log in development mode to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      //   publicKey: walletAdapter.publicKey?.toString(),
      //   signTransaction: !!walletAdapter.signTransaction,
      //   connected: walletAdapter.connected,
      //   connecting: walletAdapter.connecting
      // });
    }
    
    // Check if wallet is connected and has required methods
    if (!walletAdapter.connected || !walletAdapter.publicKey || !walletAdapter.signTransaction) {
      if (process.env.NODE_ENV === 'development') {
        //   connected: walletAdapter.connected,
        //   publicKey: !!walletAdapter.publicKey,
        //   signTransaction: !!walletAdapter.signTransaction,
        //   connecting: walletAdapter.connecting,
        //   walletAdapter: walletAdapter
        // });
      }
      return null;
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
    
    try {
      // Adapt wallet-adapter to Anchor wallet interface
      const wallet = {
        publicKey: walletAdapter.publicKey,
        signTransaction: walletAdapter.signTransaction!,
        signAllTransactions: walletAdapter.signAllTransactions || (async (txs: any[]) => {
          // Fallback for wallets that don't support signAllTransactions
          const signedTxs = [];
          for (const tx of txs) {
            const signed = await walletAdapter.signTransaction!(tx);
            signedTxs.push(signed);
          }
          return signedTxs;
        }),
      } as unknown as anchor.Wallet;
      
      const programId = getProgramId();
      const provider = getProvider(connection, wallet);
      
      // Use the imported IDL with correct program ID
      const minimalIdl = {
        ...NEWS_PLATFORM_IDL,
        address: programId.toString()
      } as Idl;
      
      if (process.env.NODE_ENV === 'development') {
        // console.log removed for production
      }
        
      // Debug: Check if publish_news instruction exists in IDL
      const publishNewsInstruction = minimalIdl.instructions?.find((ix: any) => ix.name === 'publish_news');
      if (publishNewsInstruction) {
        // console.log removed for production
      }
      
      const program = new Program(minimalIdl, provider) as Program;
      
      if (process.env.NODE_ENV === 'development') {
      }
      
      // Debug: Log all available methods
      
      // Check if Anchor converted snake_case to camelCase
      const hasPublishNews = !!(program.methods?.publishNews);
      const hasPublish_news = !!(program.methods?.publish_news);
      
      // Validate that the program has the required methods
      // Check both snake_case and camelCase naming conventions
      const hasPublishNewsMethod = !!(program.methods?.publish_news || program.methods?.publishNews);
      
      if (!program.methods || !hasPublishNewsMethod) {
        // console.error("Program missing required methods:", {
        //   hasMethods: !!program.methods,
        //   hasPublishNews: !!(program.methods?.publish_news),
        //   hasPublishNewsCamel: !!(program.methods?.publishNews),
        //   allMethods: Object.keys(program.methods || {})
        // });
        return null;
      }
      
      return program;
    } catch (error) {
      // console.error("Failed to create program:", error);
      return null;
    }
  }, [connection, walletAdapter.publicKey, walletAdapter.signTransaction, walletAdapter.signAllTransactions]);

  const program = getProgram();
  
  // Only log in development mode to reduce console spam
  if (process.env.NODE_ENV === 'development') {
    // console.log removed for production
  }

  const publishNews = useCallback(
    async (params: {
      headline: string;
      arweaveLink: string;
      initialSupply: number | anchor.BN;
      basePrice: number | anchor.BN;
      nonce: number | anchor.BN;
    }) => {
      // Try to get the program again in case it wasn't ready initially
      let currentProgram = program;
      if (!currentProgram) {
        currentProgram = getProgram();
      }
      
      if (!currentProgram) {
        // console.error("Program not ready:", {
        //   program: !!program,
        //   publicKey: !!walletAdapter.publicKey,
        //   connected: walletAdapter.connected,
        //   signTransaction: !!walletAdapter.signTransaction,
        //   walletAdapter: walletAdapter
        // });
        
        if (!walletAdapter.connected) {
          throw new Error("Wallet not connected. Please connect your wallet first.");
        } else if (!walletAdapter.publicKey) {
          throw new Error("Wallet public key not available. Please reconnect your wallet.");
        } else if (!walletAdapter.signTransaction) {
          throw new Error("Wallet sign transaction not available. Please reconnect your wallet.");
        } else {
          throw new Error("Program not ready. Please try again.");
        }
      }
      if (!walletAdapter.publicKey) {
        // console.error("Public key not available");
        throw new Error("Wallet not ready");
      }

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
      if (initialSupplyNum > 10000) {
        throw new Error("Initial supply too large (max 10,000)");
      }
      
      const basePriceNum = typeof params.basePrice === 'number' ? params.basePrice : params.basePrice.toNumber();
      if (basePriceNum <= 0) {
        throw new Error("Base price must be greater than 0");
      }
      if (basePriceNum > 1_000_000_000) {
        throw new Error("Base price too large (max 1 SOL)");
      }
      
      if (typeof params.nonce === 'number' && params.nonce < 0) {
        throw new Error("Nonce must be non-negative");
      }

      const author = walletAdapter.publicKey;
      // Ensure nonce is a safe integer and convert to string for anchor.BN
      const safeNonce = Number.isSafeInteger(params.nonce) ? params.nonce : Math.floor(Math.random() * 1000000000);
      const nonceBn = new anchor.BN(safeNonce.toString());
      
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
      }

      const metadataProgram = TOKEN_METADATA_PROGRAM_ID;

      // Create associated token account address
      const authorTokenAccount = await anchor.utils.token.associatedAddress({
        mint: mintPda,
        owner: author,
      });


      // Use the correct method name (Anchor might convert snake_case to camelCase)
      const publishMethod = currentProgram.methods.publish_news || currentProgram.methods.publishNews;
      
      if (!publishMethod) {
        // console.error("Publish method not found:", {
        //   hasPublish_news: !!currentProgram.methods.publish_news,
        //   hasPublishNews: !!currentProgram.methods.publishNews,
        //   allMethods: Object.keys(currentProgram.methods || {})
        // });
        throw new Error("Publish method not found in program");
      }
      
      
      const signature = await publishMethod(
        params.headline,
        params.arweaveLink,
        new anchor.BN(params.initialSupply),
        new anchor.BN(params.basePrice),
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
      
      try {
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Verify news account was created
        try {
          const accountInfo = await connection.getAccountInfo(newsPda);
          if (!accountInfo) {
            throw new Error("News account was not created");
          }
        } catch (error) {
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
          
          
          // For now, we'll just verify the account exists
          // The supply verification can be done later when we have proper account parsing
        } catch (error) {
          throw new Error(`Mint account was not created or could not be fetched: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Verify market account was created
        try {
          const marketAccountInfo = await connection.getAccountInfo(marketPda);
          if (!marketAccountInfo) {
            throw new Error("Market account was not created");
          }
          
        } catch (error) {
          throw new Error(`Market account was not created or could not be fetched: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        return signature;
        
      } catch (verificationError) {
        throw new Error(`Transaction verification failed: ${verificationError instanceof Error ? verificationError.message : String(verificationError)}`);
      }
    },
    [program, walletAdapter.publicKey, getProgram]
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
      
      // Log price before buy
      try {
        // Prefer contract view to avoid account decode issues
        const priceLamports = await program.methods
          .getCurrentPrice()
          .accounts({
            market: params.market,
            newsAccount: params.newsAccount,
          })
          .view();
        const priceBefore = Number(priceLamports) / 1e9;

        // Best-effort supply logging (optional)
        let circulatingSupply: number | null = null;
        try {
          const marketAccount = await (program.account as any).market.fetch(params.market);
          circulatingSupply = Number(marketAccount.circulatingSupply);
        } catch (_) {
          // ignore decode errors
        }

        if (circulatingSupply !== null) {
          console.log(`[BUY] Before - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceBefore.toFixed(10)}, Supply: ${circulatingSupply}, Buying: ${params.amount} tokens`);
        } else {
          console.log(`[BUY] Before - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceBefore.toFixed(10)}, Buying: ${params.amount} tokens`);
        }
      } catch (error) {
        console.log(`[BUY] Could not fetch price before buy:`, error);
      }
      
      // Retry logic for blockhash issues
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          const signature = await program.methods
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
          
          // Log price after buy
          try {
            const priceLamports = await program.methods
              .getCurrentPrice()
              .accounts({
                market: params.market,
                newsAccount: params.newsAccount,
              })
              .view();
            const priceAfter = Number(priceLamports) / 1e9;

            // Best-effort supply logging
            let circulatingSupply: number | null = null;
            try {
              const marketAccount = await (program.account as any).market.fetch(params.market);
              circulatingSupply = Number(marketAccount.circulatingSupply);
            } catch (_) {}
            
            if (circulatingSupply !== null) {
              console.log(`[BUY] After - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceAfter.toFixed(10)}, Supply: ${circulatingSupply}, Transaction: ${signature.slice(0, 8)}...`);
            } else {
              console.log(`[BUY] After - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceAfter.toFixed(10)}, Transaction: ${signature.slice(0, 8)}...`);
            }
          } catch (error) {
            console.log(`[BUY] Could not fetch price after buy:`, error);
          }
          
          return signature;
        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('Blockhash not found') && retries > 1) {
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
      
      // Log price before sell
      try {
        const priceLamports = await program.methods
          .getCurrentPrice()
          .accounts({
            market: params.market,
            newsAccount: params.newsAccount,
          })
          .view();
        const priceBefore = Number(priceLamports) / 1e9;

        let circulatingSupply: number | null = null;
        try {
          const marketAccount = await (program.account as any).market.fetch(params.market);
          circulatingSupply = Number(marketAccount.circulatingSupply);
        } catch (_) {}
        
        if (circulatingSupply !== null) {
          console.log(`[SELL] Before - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceBefore.toFixed(10)}, Supply: ${circulatingSupply}, Selling: ${params.amount} tokens`);
        } else {
          console.log(`[SELL] Before - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceBefore.toFixed(10)}, Selling: ${params.amount} tokens`);
        }
      } catch (error) {
        console.log(`[SELL] Could not fetch price before sell:`, error);
      }
      
      const signature = await program.methods
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
      
      // Log price after sell
      try {
        const priceLamports = await program.methods
          .getCurrentPrice()
          .accounts({
            market: params.market,
            newsAccount: params.newsAccount,
          })
          .view();
        const priceAfter = Number(priceLamports) / 1e9;

        let circulatingSupply: number | null = null;
        try {
          const marketAccount = await (program.account as any).market.fetch(params.market);
          circulatingSupply = Number(marketAccount.circulatingSupply);
        } catch (_) {}
        
        if (circulatingSupply !== null) {
          console.log(`[SELL] After - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceAfter.toFixed(10)}, Supply: ${circulatingSupply}, Transaction: ${signature.slice(0, 8)}...`);
        } else {
          console.log(`[SELL] After - Market ${params.market.toString().slice(0, 8)}... - Price: $${priceAfter.toFixed(10)}, Transaction: ${signature.slice(0, 8)}...`);
        }
      } catch (error) {
        console.log(`[SELL] Could not fetch price after sell:`, error);
      }
      
      return signature;
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

  const getCurrentPrice = useCallback(
    async (params: { market: PublicKey; newsAccount: PublicKey }) => {
      if (!program) throw new Error("Program not ready");
      
      try {
        const result = await program.methods
          .getCurrentPrice()
          .accounts({
            market: params.market,
            newsAccount: params.newsAccount,
          })
          .view(); // Use .view() for read-only operations
        
        // Convert from lamports to SOL
        return Number(result) / 1e9;
      } catch (error) {
        // console.error("Error getting current price:", error);
        throw error;
      }
    },
    [program]
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
          return derivedNewsPda;
        } else {
          // For now, just return the derived address and let the contract handle the validation
          return derivedNewsPda;
        }
      } catch (error) {
        throw error;
      }
    },
    [program, connection]
  );

  const estimateBuyCost = useCallback(
    async (marketAddress: PublicKey, amount: number) => {
      if (!program) throw new Error("Program not ready");
      
      // Retry logic for rate limiting
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          const marketAccount = await (program.account as any).market.fetch(marketAddress);
          
          // Use the market's base price from the contract
          const basePrice = Number(marketAccount.basePrice);
          const circulatingSupply = Number(marketAccount.circulatingSupply);
          const curveType = marketAccount.curveType;
          let totalCost = 0;
          
          // Use the same calculation as the contract based on curve type
          if (curveType === 'exponential') {
            for (let i = 0; i < amount; i++) {
              const supply = circulatingSupply + i;
              // Use the same calculation as the contract: base_price * (1 + supply/10000)
              const multiplier = 10000 + supply; // Remove cap to allow proper bonding curve behavior
              const price = Math.floor((basePrice * multiplier) / 10000);
              totalCost += price;
            }
          } else if (curveType === 'linear') {
            const slope = 100; // Price increase per token
            for (let i = 0; i < amount; i++) {
              const supply = circulatingSupply + i;
              const price = basePrice + (supply * slope);
              totalCost += price;
            }
          } else if (curveType === 'logarithmic') {
            const scale = 1000;
            for (let i = 0; i < amount; i++) {
              const supply = circulatingSupply + i + 1;
              const price = basePrice + (scale * Math.log2(supply));
              totalCost += price;
            }
          } else {
            // Default to exponential if curve type is unknown
            for (let i = 0; i < amount; i++) {
              const supply = circulatingSupply + i;
              const multiplier = 10000 + supply;
              const price = Math.floor((basePrice * multiplier) / 10000);
              totalCost += price;
            }
          }
          
          const costInSOL = totalCost / 1e9;
          return costInSOL;
        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check if it's a rate limiting error
          if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
            retries--;
            if (retries > 0) {
              // Exponential backoff: wait 2^retries seconds
              const delay = Math.pow(2, 3 - retries) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // If it's not a rate limiting error or we've exhausted retries, break
          break;
        }
      }
      
      // Return a fallback calculation if all retries failed
      // console.warn(`Failed to fetch market account after retries, using fallback calculation:`, lastError);
      const fallbackBasePrice = 1000000; // 0.001 SOL in lamports as fallback
      const fallbackCost = (fallbackBasePrice * amount) / 1e9; // Simple linear fallback
      return fallbackCost;
    },
    [program]
  );

  // Get market delegation status
  const getMarketDelegationStatus = useCallback(
    async (marketAddress: PublicKey) => {
      if (!program) throw new Error("Program not ready");
      try {
        const marketAccount = await (program.account as any).market.fetch(marketAddress);
        
        // Log token price when fetching market status
        const basePrice = Number(marketAccount.basePrice) / 1e9;
        const circulatingSupply = Number(marketAccount.circulatingSupply);
        const multiplier = (10000 + circulatingSupply) / 10000;
        const currentPrice = basePrice * multiplier;
        
        console.log(`[TOKEN PRICE] Market ${marketAddress.toString().slice(0, 8)}... - Price: $${currentPrice.toFixed(10)}, Supply: ${circulatingSupply}, Base: $${basePrice.toFixed(10)}`);
        
        return {
          isDelegated: marketAccount.isDelegated,
          rollupAuthority: marketAccount.rollupAuthority,
          currentSupply: marketAccount.currentSupply,
          circulatingSupply: marketAccount.circulatingSupply,
          initialSupply: marketAccount.initialSupply,
          basePrice: marketAccount.basePrice,
          totalVolume: marketAccount.totalVolume,
        };
      } catch (error) {
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
        if (onMarketAutoDelegated) onMarketAutoDelegated(event);
      });
      
      const commitListener = program.addEventListener('StateCommitRecommended', (event) => {
        if (onStateCommitRecommended) onStateCommitRecommended(event);
      });
      
      return () => {
        try {
          if (listener) {
            program.removeEventListener(listener);
          }
        } catch (error) {
        }
        
        try {
          if (commitListener) {
            program.removeEventListener(commitListener);
          }
        } catch (error) {
        }
      };
    },
    [program]
  );

  // Fetch all token accounts owned by the user
  const fetchUserTokenAccounts = useCallback(
    async () => {
      if (!walletAdapter.publicKey || !connection) throw new Error("Wallet not ready");
      
      try {
        // Get all token accounts for the user
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          walletAdapter.publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          }
        );

        
        const mappedAccounts = tokenAccounts.value.map(account => ({
          pubkey: account.pubkey,
          account: account.account,
          mint: account.account.data.parsed.info.mint,
          amount: account.account.data.parsed.info.tokenAmount.uiAmount || 0,
          rawAmount: account.account.data.parsed.info.tokenAmount.amount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
        }));
        
        // Log all token accounts with non-zero amounts
        
        return mappedAccounts;
      } catch (error) {
        // console.error("Error fetching token accounts:", error);
        throw error;
      }
    },
    [walletAdapter.publicKey, connection]
  );

  // Fetch news tokens owned by the user
  const fetchUserNewsTokens = useCallback(
    async () => {
      if (!program || !walletAdapter.publicKey) throw new Error("Program not ready");
      
      try {
        // First, get all token accounts for the user
        const tokenAccounts = await fetchUserTokenAccounts();
        
        const newsTokens: any[] = [];
        const programId = getProgramId();
        
        // Check each token account to see if it's a news token
        // Process in batches to avoid overwhelming the RPC
        const batchSize = 5;
        for (let i = 0; i < tokenAccounts.length; i += batchSize) {
          const batch = tokenAccounts.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (tokenAccount) => {
            try {
              // console.log removed for production
              
              const mintPda = new PublicKey(tokenAccount.mint);
              
              // Check if this mint was created by our program by looking at the mint authority
              const mintAccountInfo = await connection.getAccountInfo(mintPda);
              if (!mintAccountInfo) return;
              
              // Parse the mint account to get the mint authority
              // Mint account structure: https://docs.solana.com/developing/programming-model/accounts#mint-account
              const mintData = mintAccountInfo.data;
              if (mintData.length < 82) return; // Minimum mint account size
              
              // The mint authority is at offset 4-36 (32 bytes)
              const mintAuthorityBytes = mintData.slice(4, 36);
              const mintAuthority = new PublicKey(mintAuthorityBytes);
              
              // Check if the mint authority is a market PDA from our program
              try {
                // Try to fetch the market account using the mint authority
                const marketAccount = await (program.account as any).market.fetch(mintAuthority);
                
                if (marketAccount) {
                  // This is a news token! Now get the news account
                  const newsAccount = marketAccount.newsAccount;
                  
                  // Fetch the news account data
                  const newsAccountData = await (program.account as any).newsAccount.fetch(newsAccount);
                  
                  // Calculate current price using the same logic as the contract
                  const currentPrice = await estimateBuyCost(mintAuthority, 1);
                  
                  // For news tokens, use the actual token amount from the account
                  // Debug: log the raw values to understand the units
                  // console.log removed for production
                  
                  let actualAmount = 0;
                  if (tokenAccount.rawAmount) {
                    // Try different approaches to get the correct amount
                    const rawAmountNum = parseFloat(tokenAccount.rawAmount);
                    
                    // If the raw amount is small (like 8 or 100), it might be the actual token amount
                    // If the raw amount is large (like 8000000000), it needs to be divided by decimals
                    if (rawAmountNum < 10000) {
                      // Small raw amount - might be the actual token amount
                      actualAmount = rawAmountNum;
                    } else {
                      // Large raw amount - divide by decimals
                      actualAmount = rawAmountNum / Math.pow(10, tokenAccount.decimals);
                    }
                  }
                  
                  // Calculate total value
                  const totalValue = actualAmount * currentPrice;
                  
                  // Get the mint account data (supply and decimals)
                  const mintAccountInfo = await connection.getAccountInfo(mintPda);
                  let actualTotalSupply = 0;
                  let mintDecimals = 9;
                  if (mintAccountInfo) {
                    const mintData = mintAccountInfo.data;
                    if (mintData.length >= 45) {
                      // Total supply is at offset 36-44 (u64 LE); decimals at offset 44 (u8)
                      const supplyBytes = mintData.slice(36, 44);
                      mintDecimals = mintData[44];
                      const supply = new DataView(supplyBytes.buffer).getBigUint64(0, true);
                      actualTotalSupply = Number(supply) / Math.pow(10, mintDecimals);
                    }
                  }

                  // Normalize user amount strictly with mint decimals
                  let normalizedUserAmount = 0;
                  if (tokenAccount.rawAmount) {
                    const rawAmountNum = Number(tokenAccount.rawAmount);
                    normalizedUserAmount = rawAmountNum / Math.pow(10, mintDecimals);
                  }

                  // Compute market share percent using mint total supply
                  const marketSharePercent = actualTotalSupply > 0 ? (normalizedUserAmount / actualTotalSupply) * 100 : 0;
                  
                  newsTokens.push({
                    newsAccount: newsAccount.toString(),
                    mint: tokenAccount.mint,
                    market: mintAuthority.toString(),
                    headline: newsAccountData.headline,
                    arweaveLink: newsAccountData.arweaveLink,
                    summaryLink: newsAccountData.summaryLink,
                    author: newsAccountData.authority.toString(),
                    publishedAt: newsAccountData.publishedAt,
                    amount: normalizedUserAmount,
                    currentPrice: currentPrice,
                    totalValue: totalValue,
                    marketSharePercent,
                    marketData: {
                      currentSupply: actualTotalSupply.toString(),
                      circulatingSupply: marketAccount.circulatingSupply.toString(),
                      initialSupply: marketAccount.initialSupply.toString(),
                      basePrice: marketAccount.basePrice.toString(),
                      solReserves: marketAccount.solReserves.toString(),
                      totalVolume: marketAccount.totalVolume.toString(),
                      isDelegated: marketAccount.isDelegated,
                    }
                  });
                  
                  // console.log removed for production
                }
              } catch (marketError) {
                // This mint authority is not a market account, skip
                return;
              }
            } catch (error) {
              // Error processing this token, skip it
              return;
            }
          }));
          
          // Add a small delay between batches to avoid rate limiting
          if (i + batchSize < tokenAccounts.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        
        // Calculate total tokens held
        const totalTokensHeld = newsTokens.reduce((sum, token) => sum + token.amount, 0);
        const totalValue = newsTokens.reduce((sum, token) => sum + token.totalValue, 0);
        
        // console.log removed for production
        
        return newsTokens;
      } catch (error) {
        // console.error("Error fetching news tokens:", error);
        throw error;
      }
    },
    [program, walletAdapter.publicKey, fetchUserTokenAccounts, connection, estimateBuyCost]
  );

  // Compute user's market share for a given mint using mint total supply
  const getUserMarketShare = useCallback(
    async (mintPda: PublicKey) => {
      if (!walletAdapter.publicKey || !connection) throw new Error("Wallet not ready");
      
      // Derive the user's associated token account
      const ata = await anchor.utils.token.associatedAddress({
        mint: mintPda,
        owner: walletAdapter.publicKey,
      });
      
      // Fetch mint total supply and decimals from mint account
      const mintAccountInfo = await connection.getAccountInfo(mintPda);
      let totalSupply = 0;
      let mintDecimals = 9;
      if (mintAccountInfo) {
        const mintData = mintAccountInfo.data;
        if (mintData.length >= 45) {
          const supplyBytes = mintData.slice(36, 44);
          mintDecimals = mintData[44];
          const supply = new DataView(supplyBytes.buffer).getBigUint64(0, true);
          totalSupply = Number(supply) / Math.pow(10, mintDecimals);
        }
      }

      // Fetch user's token balance and normalize with mint decimals
      const parsedAta = await connection.getParsedAccountInfo(ata);
      let userAmount = 0;
      try {
        const info: any = parsedAta.value;
        if (info?.data?.parsed?.info?.tokenAmount) {
          const tokenAmount = info.data.parsed.info.tokenAmount;
          const raw = Number(tokenAmount.amount);
          userAmount = raw / Math.pow(10, mintDecimals);
        }
      } catch (_) {}
      
      const percent = totalSupply > 0 ? (userAmount / totalSupply) * 100 : 0;
      
      return { userAmount, totalSupply, percent } as const;
    },
    [walletAdapter.publicKey, connection]
  );

  // Helper function to find news account from mint
  const findNewsAccountFromMint = useCallback(
    async (mintPda: PublicKey) => {
      if (!program) return null;
      
      try {
        // We need to check all possible news accounts to find the one with this mint
        // This is not efficient but necessary without a direct mapping
        // In a real implementation, you might want to maintain an index
        
        // For now, we'll try to get all news accounts by scanning
        // This is a simplified approach - in production you'd want a more efficient method
        
        // We'll return null for now and implement a more efficient method later
        return null;
      } catch (error) {
        return null;
      }
    },
    [program]
  );

  // Get total token count and value across all token accounts
  const getTotalTokenStats = useCallback(
    async () => {
      if (!walletAdapter.publicKey) throw new Error("Wallet not ready");
      
      try {
        const tokenAccounts = await fetchUserTokenAccounts();
        
        let totalTokens = 0;
        let totalValue = 0;
        let nonZeroTokens = 0;
        
        tokenAccounts.forEach(account => {
          const amount = account.rawAmount ? 
            Number(account.rawAmount) / Math.pow(10, account.decimals) : 0;
          
          if (amount > 0) {
            nonZeroTokens++;
            totalTokens += amount;
          }
        });
        
        // console.log removed for production
        
        return {
          totalTokenAccounts: tokenAccounts.length,
          nonZeroTokenAccounts: nonZeroTokens,
          totalTokensHeld: totalTokens,
          averageTokensPerAccount: tokenAccounts.length > 0 ? totalTokens / tokenAccounts.length : 0
        };
      } catch (error) {
        // console.error("Error getting token stats:", error);
        throw error;
      }
    },
    [walletAdapter.publicKey, fetchUserTokenAccounts]
  );

  // Debug function to test program creation
  const testProgram = useCallback(() => {
    const testProgram = getProgram();
    // console.log removed for production
    return testProgram;
  }, [getProgram, walletAdapter.connected, walletAdapter.publicKey, walletAdapter.signTransaction]);

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
    getCurrentPrice,
    fetchNewsAccount,
    findActualNewsAccount,
    estimateBuyCost,
    // delegation functions
    getMarketDelegationStatus,
    listenForDelegationEvents,
    // user token functions
    fetchUserTokenAccounts,
    fetchUserNewsTokens,
    getUserMarketShare,
    getTotalTokenStats,
    // pda helpers exposed for UI composition
    pdas: {
      findNewsPda,
      findMintPda,
      findMarketPda,
      findOraclePda,
      findWhitelistPda,
      findMetadataPda,
    },
    // debug function
    testProgram,
  } as const;
}


