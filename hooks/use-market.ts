import { useCallback, useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { PROGRAM_ID } from './program-id'

export type CurveType = 'linear' | 'exponential' | 'logarithmic'

export interface MarketData {
  newsAccount: PublicKey
  mint: PublicKey
  curveType: CurveType
  currentSupply: number
  solReserves: number
  totalVolume: number
  isDelegated: boolean
  rollupAuthority: PublicKey | null
  bump: number
}

export function useMarket(marketAddress: PublicKey | null) {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async () => {
    if (!marketAddress || !program) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const accountData = await program.account.market.fetch(marketAddress)
      
      // Convert curve type from enum to string
      let curveType: CurveType = 'linear'
      if (accountData.curveType.linear) {
        curveType = 'linear'
      } else if (accountData.curveType.exponential) {
        curveType = 'exponential'
      } else if (accountData.curveType.logarithmic) {
        curveType = 'logarithmic'
      }
      
      setData({
        newsAccount: accountData.newsAccount,
        mint: accountData.mint,
        curveType,
        currentSupply: accountData.currentSupply.toNumber(),
        solReserves: accountData.solReserves.toNumber(),
        totalVolume: accountData.totalVolume.toNumber(),
        isDelegated: accountData.isDelegated,
        rollupAuthority: accountData.rollupAuthority,
        bump: accountData.bump,
      })
    } catch (err) {
      
      setError(err instanceof Error ? err.message : 'Failed to fetch market')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [marketAddress, program])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  return {
    data,
    loading,
    error,
    refetch: fetchMarket,
  }
}

// Hook to get market by news account
export function useMarketByNewsAccount(newsAccount: PublicKey | null) {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [marketAddress, setMarketAddress] = useState<PublicKey | null>(null)

  useEffect(() => {
    if (!newsAccount || !program) {
      setMarketAddress(null)
      return
    }

    try {
      const [address] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), newsAccount.toBuffer()],
        PROGRAM_ID
      )
      setMarketAddress(address)
    } catch (error) {
      
      setMarketAddress(null)
    }
  }, [newsAccount, program])

  return useMarket(marketAddress)
}

// Hook to get all markets (requires additional implementation)
export function useAllMarkets() {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [data, setData] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllMarkets = useCallback(async () => {
    if (!program) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // This would require implementing a way to get all markets
      // For now, we'll return an empty array
      // In a real implementation, you might use getProgramAccounts or an indexer
      setData([])
    } catch (err) {
      
      setError(err instanceof Error ? err.message : 'Failed to fetch markets')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [program])

  useEffect(() => {
    fetchAllMarkets()
  }, [fetchAllMarkets])

  return {
    data,
    loading,
    error,
    refetch: fetchAllMarkets,
  }
}
