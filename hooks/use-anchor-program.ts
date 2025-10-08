import { useMemo } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'

// Import the generated types
import { Contract } from '../contract/target/types/contract'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export function useAnchorProgram() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
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

      return new Program<Contract>(
        require('../contract/target/idl/contract.json'),
        PROGRAM_ID,
        provider
      )
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
