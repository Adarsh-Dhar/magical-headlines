import { useCallback, useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export interface NewsAccountData {
  authority: PublicKey
  headline: string
  arweaveLink: string
  summaryLink: string
  mint: PublicKey
  publishedAt: number
  bump: number
}

export function useNewsAccount(newsAccountAddress: PublicKey | null) {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [data, setData] = useState<NewsAccountData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNewsAccount = useCallback(async () => {
    if (!newsAccountAddress || !program) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const accountData = await program.account.newsAccount.fetch(newsAccountAddress)
      
      setData({
        authority: accountData.authority,
        headline: accountData.headline,
        arweaveLink: accountData.arweaveLink,
        summaryLink: accountData.summaryLink,
        mint: accountData.mint,
        publishedAt: accountData.publishedAt.toNumber(),
        bump: accountData.bump,
      })
    } catch (err) {
      console.error('Error fetching news account:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch news account')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [newsAccountAddress, program])

  useEffect(() => {
    fetchNewsAccount()
  }, [fetchNewsAccount])

  return {
    data,
    loading,
    error,
    refetch: fetchNewsAccount,
  }
}

// Hook to get news account by author
export function useNewsAccountByAuthor(author: PublicKey | null) {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [newsAccountAddress, setNewsAccountAddress] = useState<PublicKey | null>(null)

  useEffect(() => {
    if (!author || !program) {
      setNewsAccountAddress(null)
      return
    }

    try {
      const [address] = PublicKey.findProgramAddressSync(
        [Buffer.from('news'), author.toBuffer()],
        PROGRAM_ID
      )
      setNewsAccountAddress(address)
    } catch (error) {
      console.error('Error deriving news account address:', error)
      setNewsAccountAddress(null)
    }
  }, [author, program])

  return useNewsAccount(newsAccountAddress)
}

// Hook to get all news accounts (requires additional implementation)
export function useAllNewsAccounts() {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [data, setData] = useState<NewsAccountData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllNewsAccounts = useCallback(async () => {
    if (!program) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // This would require implementing a way to get all news accounts
      // For now, we'll return an empty array
      // In a real implementation, you might use getProgramAccounts or an indexer
      setData([])
    } catch (err) {
      console.error('Error fetching all news accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch news accounts')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [program])

  useEffect(() => {
    fetchAllNewsAccounts()
  }, [fetchAllNewsAccounts])

  return {
    data,
    loading,
    error,
    refetch: fetchAllNewsAccounts,
  }
}
