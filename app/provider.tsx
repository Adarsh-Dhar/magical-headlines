"use client";

import React, { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { TorusWalletAdapter, LedgerWalletAdapter, SolflareWalletAdapter, PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
// Note: styles are imported globally in `app/layout.tsx` to control order

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // Use Devnet public RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Configure wallet adapters
  // Note: Phantom is detected as a standard wallet and doesn't need explicit registration
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(error) => {
          // Swallow noisy adapter errors that can occur during initialization/autoconnect
          if (process.env.NODE_ENV !== "production") {
            console.debug("Wallet error:", error);
          }
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};