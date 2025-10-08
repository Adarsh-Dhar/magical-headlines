import { useCallback, useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export interface WhitelistedAuthorityData {
  authority: PublicKey
  isActive: boolean
}

export function useWhitelistedAuthority(authorityAddress: PublicKey | null) {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [data, setData] = useState<WhitelistedAuthorityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWhitelistedAuthority = useCallback(async () => {
    if (!authorityAddress || !program) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const accountData = await program.account.whitelistedAuthority.fetch(authorityAddress)
      
      setData({
        authority: accountData.authority,
        isActive: accountData.isActive,
      })
    } catch (err) {
      console.error('Error fetching whitelisted authority:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch whitelisted authority')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [authorityAddress, program])

  useEffect(() => {
    fetchWhitelistedAuthority()
  }, [fetchWhitelistedAuthority])

  return {
    data,
    loading,
    error,
    refetch: fetchWhitelistedAuthority,
  }
}

// Hook to get whitelisted authority by authority public key
export function useWhitelistedAuthorityByKey(authority: PublicKey | null) {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [whitelistAddress, setWhitelistAddress] = useState<PublicKey | null>(null)

  useEffect(() => {
    if (!authority || !program) {
      setWhitelistAddress(null)
      return
    }

    try {
      const [address] = PublicKey.findProgramAddressSync(
        [Buffer.from('whitelist'), authority.toBuffer()],
        PROGRAM_ID
      )
      setWhitelistAddress(address)
    } catch (error) {
      console.error('Error deriving whitelist address:', error)
      setWhitelistAddress(null)
    }
  }, [authority, program])

  return useWhitelistedAuthority(whitelistAddress)
}

// Hook to get all whitelisted authorities (requires additional implementation)
export function useAllWhitelistedAuthorities() {
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const [data, setData] = useState<WhitelistedAuthorityData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllWhitelistedAuthorities = useCallback(async () => {
    if (!program) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // This would require implementing a way to get all whitelisted authorities
      // For now, we'll return an empty array
      // In a real implementation, you might use getProgramAccounts or an indexer
      setData([])
    } catch (err) {
      console.error('Error fetching all whitelisted authorities:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch whitelisted authorities')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [program])

  useEffect(() => {
    fetchAllWhitelistedAuthorities()
  }, [fetchAllWhitelistedAuthorities])

  return {
    data,
    loading,
    error,
    refetch: fetchAllWhitelistedAuthorities,
  }
}
