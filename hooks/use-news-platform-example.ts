import { useCallback, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { usePublishNews } from './use-publish-news'
import { useBuyTokens } from './use-buy-tokens'
import { useSellTokens } from './use-sell-tokens'
import { useInitializeMarket } from './use-initialize-market'
import { useDelegateMarket } from './use-delegate-market'
import { useUndelegateMarket } from './use-undelegate-market'
import { useCommitRollup } from './use-commit-rollup'
import { useInitializeOracle } from './use-initialize-oracle'
import { useAddAuthority } from './use-add-authority'
import { useUpdateSummaryLink } from './use-update-summary-link'
import { useNewsAccount } from './use-news-account'
import { useMarket } from './use-market'
import { useOracle } from './use-oracle'
import { useWhitelistedAuthority } from './use-whitelisted-authority'
import { useBondingCurve } from './use-bonding-curve'
import { PROGRAM_ID } from './program-id'

// Example hook that demonstrates how to use all the news platform hooks
export function useNewsPlatformExample() {
  const [selectedNewsAccount, setSelectedNewsAccount] = useState<PublicKey | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<PublicKey | null>(null)
  const [selectedOracle, setSelectedOracle] = useState<PublicKey | null>(null)

  // Initialize all the hooks
  const publishNews = usePublishNews()
  const buyTokens = useBuyTokens()
  const sellTokens = useSellTokens()
  const initializeMarket = useInitializeMarket()
  const delegateMarket = useDelegateMarket()
  const undelegateMarket = useUndelegateMarket()
  const commitRollup = useCommitRollup()
  const initializeOracle = useInitializeOracle()
  const addAuthority = useAddAuthority()
  const updateSummaryLink = useUpdateSummaryLink()

  // Data fetching hooks
  const newsAccount = useNewsAccount(selectedNewsAccount)
  const market = useMarket(selectedMarket)
  const oracle = useOracle(selectedOracle)
  const whitelistedAuthority = useWhitelistedAuthority(selectedOracle)

  // Bonding curve calculations
  const bondingCurve = useBondingCurve()

  // Example workflow functions
  const createNewsStory = useCallback(async (headline: string, arweaveLink: string, initialSupply: number) => {
    const result = await publishNews.publishNews({
      headline,
      arweaveLink,
      initialSupply,
    })

    if (result) {
      setSelectedNewsAccount(result.newsAccount)
      return result
    }
    return null
  }, [publishNews])

  const createMarket = useCallback(async (newsAccount: PublicKey, mint: PublicKey, curveType: 'linear' | 'exponential' | 'logarithmic') => {
    const result = await initializeMarket.initializeMarket({
      newsAccount,
      mint,
      curveType,
    })

    if (result) {
      setSelectedMarket(result.market)
      return result
    }
    return null
  }, [initializeMarket])

  const tradeTokens = useCallback(async (market: PublicKey, mint: PublicKey, amount: number, isBuy: boolean) => {
    if (isBuy) {
      return await buyTokens.buyTokens({ market, mint, amount })
    } else {
      return await sellTokens.sellTokens({ market, mint, amount })
    }
  }, [buyTokens, sellTokens])

  const setupOracle = useCallback(async () => {
    const result = await initializeOracle.initializeOracle()
    if (result) {
      setSelectedOracle(result.oracle)
      return result
    }
    return null
  }, [initializeOracle])

  const addOracleAuthority = useCallback(async (oracle: PublicKey, authority: PublicKey) => {
    return await addAuthority.addAuthority({ oracle, authority })
  }, [addAuthority])

  const updateSummary = useCallback(async (newsAccount: PublicKey, oracleAuthority: PublicKey, summaryLink: string) => {
    return await updateSummaryLink.updateSummaryLink({
      newsAccount,
      oracleAuthority,
      summaryLink,
    })
  }, [updateSummaryLink])

  const delegateToRollup = useCallback(async (market: PublicKey, rollupAuthority: PublicKey) => {
    return await delegateMarket.delegateMarket({ market, rollupAuthority })
  }, [delegateMarket])

  const undelegateFromRollup = useCallback(async (market: PublicKey, rollupAuthority: PublicKey) => {
    return await undelegateMarket.undelegateMarket({ market, rollupAuthority })
  }, [undelegateMarket])

  const commitRollupState = useCallback(async (market: PublicKey, rollupAuthority: PublicKey, newSupply: number, newReserves: number) => {
    return await commitRollup.commitRollup({
      market,
      rollupAuthority,
      newSupply,
      newReserves,
    })
  }, [commitRollup])

  // Calculate trading costs
  const calculateTradeCost = useCallback((amount: number, isBuy: boolean) => {
    if (!market.data) return null

    const { currentSupply, curveType } = market.data

    if (isBuy) {
      return bondingCurve.calculateBuyCost({ currentSupply, amount, curveType })
    } else {
      return bondingCurve.calculateSellRefund({ currentSupply, amount, curveType })
    }
  }, [market.data, bondingCurve])

  // Get current price
  const getCurrentPrice = useCallback(() => {
    if (!market.data) return 0

    const { currentSupply, curveType } = market.data
    return bondingCurve.calculatePriceAtSupply(currentSupply, curveType)
  }, [market.data, bondingCurve])

  // Get market statistics
  const getMarketStats = useCallback(() => {
    if (!market.data) return null

    const { currentSupply, solReserves, totalVolume, curveType } = market.data
    const currentPrice = bondingCurve.calculatePriceAtSupply(currentSupply, curveType)
    const totalValue = bondingCurve.calculateTotalValue(currentSupply, curveType)

    return {
      currentSupply,
      solReserves,
      totalVolume,
      currentPrice,
      totalValue,
      curveType,
      isDelegated: market.data.isDelegated,
      rollupAuthority: market.data.rollupAuthority,
    }
  }, [market.data, bondingCurve])

  return {
    // State
    selectedNewsAccount,
    selectedMarket,
    selectedOracle,
    setSelectedNewsAccount,
    setSelectedMarket,
    setSelectedOracle,

    // Actions
    createNewsStory,
    createMarket,
    tradeTokens,
    setupOracle,
    addOracleAuthority,
    updateSummary,
    delegateToRollup,
    undelegateFromRollup,
    commitRollupState,

    // Data
    newsAccount,
    market,
    oracle,
    whitelistedAuthority,

    // Calculations
    calculateTradeCost,
    getCurrentPrice,
    getMarketStats,

    // Bonding curve utilities
    bondingCurve,

    // Loading states
    isLoading: publishNews.isLoading || buyTokens.isLoading || sellTokens.isLoading || 
               initializeMarket.isLoading || delegateMarket.isLoading || undelegateMarket.isLoading ||
               commitRollup.isLoading || initializeOracle.isLoading || addAuthority.isLoading ||
               updateSummaryLink.isLoading,
  }
}

// Example component hook for a specific news story
export function useNewsStory(newsAccountAddress: PublicKey) {
  const newsAccount = useNewsAccount(newsAccountAddress)
  const market = useMarketByNewsAccount(newsAccountAddress)
  const bondingCurve = useBondingCurve()

  const getStoryData = useCallback(() => {
    if (!newsAccount.data || !market.data) return null

    return {
      ...newsAccount.data,
      market: market.data,
      currentPrice: bondingCurve.calculatePriceAtSupply(market.data.currentSupply, market.data.curveType),
      totalValue: bondingCurve.calculateTotalValue(market.data.currentSupply, market.data.curveType),
    }
  }, [newsAccount.data, market.data, bondingCurve])

  return {
    newsAccount,
    market,
    storyData: getStoryData(),
    bondingCurve,
  }
}

// Helper hook for market by news account
function useMarketByNewsAccount(newsAccount: PublicKey | null) {
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
      console.error('Error deriving market address:', error)
      setMarketAddress(null)
    }
  }, [newsAccount, program])

  return useMarket(marketAddress)
}
