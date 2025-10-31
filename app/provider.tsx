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
  // Note: Wallets that support Wallet Standard (e.g., Phantom, Backpack, Solflare)
  // are auto-discovered, but explicit adapters can be more reliable for connection
  const wallets = useMemo(
    () => [
      // Explicitly include Phantom with network configuration for better reliability
      new PhantomWalletAdapter({ network }),
      // Keep Solflare adapter for legacy support
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(error, adapter) => {
          // Only log errors that are not related to auto-connect failures
          // Auto-connect errors are expected when no wallet is previously connected
          if (error.name !== 'WalletConnectionError' && error.name !== 'WalletNotFoundError') {
            console.error("Wallet error:", error);
          }
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};