import { useMemo } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'

// Import the generated types
import { NewsPlatform } from '../contract/target/types/news_platform'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export function useAnchorProgram() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const program = useMemo(() => {
    // Check if wallet is connected and has required methods
    if (!wallet || !wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null
    }

    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        {
          preflightCommitment: 'processed',
          commitment: 'processed',
        }
      )

      const idl = require('../contract/target/idl/news_platform.json')
      return new Program<NewsPlatform>(idl, provider)
    } catch (error) {
      console.error('Error creating anchor program:', error)
      return null
    }
  }, [connection, wallet])

  return program
}

// Hook to get the program ID
export function useProgramId() {
  return PROGRAM_ID
}

// Hook to check if the program is ready
export function useIsProgramReady() {
  const program = useAnchorProgram()
  return program !== null
}
