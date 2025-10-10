import { useCallback, useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { PROGRAM_ID } from './program-id'

export interface OracleData {
  admin: PublicKey
  bump: number
}

export function useOracle(oracleAddress: PublicKey | null) {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [data, setData] = useState<OracleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOracle = useCallback(async () => {
    if (!oracleAddress || !program) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const accountData = await program.account.oracle.fetch(oracleAddress)
      
      setData({
        admin: accountData.admin,
        bump: accountData.bump,
      })
    } catch (err) {
      
      setError(err instanceof Error ? err.message : 'Failed to fetch oracle')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [oracleAddress, program])

  useEffect(() => {
    fetchOracle()
  }, [fetchOracle])

  return {
    data,
    loading,
    error,
    refetch: fetchOracle,
  }
}

// Hook to get the main oracle (singleton)
export function useMainOracle() {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [oracleAddress, setOracleAddress] = useState<PublicKey | null>(null)

  useEffect(() => {
    if (!program) {
      setOracleAddress(null)
      return
    }

    try {
      const [address] = PublicKey.findProgramAddressSync(
        [Buffer.from('oracle')],
        PROGRAM_ID
      )
      setOracleAddress(address)
    } catch (error) {
      
      setOracleAddress(null)
    }
  }, [program])

  return useOracle(oracleAddress)
}
