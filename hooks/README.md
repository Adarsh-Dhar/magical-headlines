# News Platform Hooks

This directory contains React hooks for interacting with the News Platform Solana program. These hooks provide a clean, type-safe interface for all contract functions and data fetching.

## Overview

The News Platform is a decentralized news trading platform where users can:
- Publish news stories as tradable tokens
- Trade news tokens using bonding curves
- Delegate markets to high-speed rollups
- Manage oracle authorities for AI summaries

## Installation

Make sure you have the required dependencies:

```bash
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

## Usage

### Basic Setup

```tsx
import { WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { ConnectionProvider } from '@solana/wallet-adapter-react'
import { useNewsPlatform } from './hooks/use-news-platform'

function App() {
  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider>
        <WalletModalProvider>
          <NewsPlatformApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
```

### Publishing News

```tsx
import { usePublishNews } from './hooks/use-publish-news'

function PublishNewsForm() {
  const { publishNews, isLoading } = usePublishNews()

  const handleSubmit = async (headline: string, arweaveLink: string, initialSupply: number) => {
    const result = await publishNews({
      headline,
      arweaveLink,
      initialSupply,
    })

    if (result) {
      console.log('News published:', result.newsAccount.toString())
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
    </form>
  )
}
```

### Trading Tokens

```tsx
import { useBuyTokens, useSellTokens } from './hooks/use-buy-tokens'
import { useSellTokens } from './hooks/use-sell-tokens'

function TradingInterface({ market, mint }) {
  const { buyTokens } = useBuyTokens()
  const { sellTokens } = useSellTokens()

  const handleBuy = async (amount: number) => {
    const result = await buyTokens({
      market,
      mint,
      amount,
    })

    if (result) {
      console.log('Bought tokens:', result.transactionSignature)
    }
  }

  const handleSell = async (amount: number) => {
    const result = await sellTokens({
      market,
      mint,
      amount,
    })

    if (result) {
      console.log('Sold tokens:', result.transactionSignature)
    }
  }

  return (
    <div>
      <button onClick={() => handleBuy(1000)}>Buy 1000 tokens</button>
      <button onClick={() => handleSell(1000)}>Sell 1000 tokens</button>
    </div>
  )
}
```

### Market Management

```tsx
import { useInitializeMarket, useDelegateMarket } from './hooks/use-initialize-market'
import { useDelegateMarket } from './hooks/use-delegate-market'

function MarketManager({ newsAccount, mint }) {
  const { initializeMarket } = useInitializeMarket()
  const { delegateMarket } = useDelegateMarket()

  const handleInitializeMarket = async (curveType: 'linear' | 'exponential' | 'logarithmic') => {
    const result = await initializeMarket({
      newsAccount,
      mint,
      curveType,
    })

    if (result) {
      console.log('Market initialized:', result.market.toString())
    }
  }

  const handleDelegate = async (market: PublicKey, rollupAuthority: PublicKey) => {
    const result = await delegateMarket({
      market,
      rollupAuthority,
    })

    if (result) {
      console.log('Market delegated:', result.transactionSignature)
    }
  }

  return (
    <div>
      <button onClick={() => handleInitializeMarket('linear')}>Initialize Linear Market</button>
      <button onClick={() => handleDelegate(market, rollupAuthority)}>Delegate to Rollup</button>
    </div>
  )
}
```

### Data Fetching

```tsx
import { useNewsAccount, useMarket, useOracle } from './hooks/use-news-account'

function NewsStoryDisplay({ newsAccountAddress }) {
  const { data: newsAccount, loading, error } = useNewsAccount(newsAccountAddress)
  const { data: market } = useMarket(marketAddress)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!newsAccount) return <div>News account not found</div>

  return (
    <div>
      <h1>{newsAccount.headline}</h1>
      <p>Author: {newsAccount.authority.toString()}</p>
      <p>Published: {new Date(newsAccount.publishedAt * 1000).toLocaleString()}</p>
      <p>Arweave Link: <a href={newsAccount.arweaveLink}>{newsAccount.arweaveLink}</a></p>
      {newsAccount.summaryLink && (
        <p>AI Summary: <a href={newsAccount.summaryLink}>{newsAccount.summaryLink}</a></p>
      )}
      {market && (
        <div>
          <p>Current Supply: {market.currentSupply}</p>
          <p>SOL Reserves: {market.solReserves / 1e9} SOL</p>
          <p>Total Volume: {market.totalVolume / 1e9} SOL</p>
        </div>
      )}
    </div>
  )
}
```

### Bonding Curve Calculations

```tsx
import { useBondingCurve } from './hooks/use-bonding-curve'

function BondingCurveCalculator() {
  const { calculateBuyCost, calculateSellRefund, calculatePriceAtSupply } = useBondingCurve()

  const currentSupply = 10000
  const amount = 1000
  const curveType = 'linear'

  const buyCost = calculateBuyCost({ currentSupply, amount, curveType })
  const sellRefund = calculateSellRefund({ currentSupply, amount, curveType })
  const currentPrice = calculatePriceAtSupply(currentSupply, curveType)

  return (
    <div>
      <h3>Bonding Curve Calculator</h3>
      <p>Current Supply: {currentSupply}</p>
      <p>Current Price: {currentPrice / 1e9} SOL</p>
      <p>Buy {amount} tokens for: {buyCost / 1e9} SOL</p>
      <p>Sell {amount} tokens for: {sellRefund / 1e9} SOL</p>
    </div>
  )
}
```

## Available Hooks

### Action Hooks
- `usePublishNews` - Publish a new news story
- `useBuyTokens` - Buy tokens from a market
- `useSellTokens` - Sell tokens back to a market
- `useInitializeMarket` - Initialize a bonding curve market
- `useDelegateMarket` - Delegate market to rollup
- `useUndelegateMarket` - Undelegate market from rollup
- `useCommitRollup` - Commit rollup state to main chain
- `useInitializeOracle` - Initialize the oracle system
- `useAddAuthority` - Add oracle authority to whitelist
- `useUpdateSummaryLink` - Update AI summary link

### Data Hooks
- `useNewsAccount` - Fetch news account data
- `useMarket` - Fetch market data
- `useOracle` - Fetch oracle data
- `useWhitelistedAuthority` - Fetch whitelisted authority data

### Utility Hooks
- `useBondingCurve` - Bonding curve calculations
- `useAnchorProgram` - Anchor program instance
- `useNewsPlatformExample` - Complete example implementation

## Error Handling

All hooks include error handling and will display toast notifications for errors. You can also access error states directly:

```tsx
const { data, loading, error } = useNewsAccount(newsAccountAddress)

if (error) {
  console.error('Error:', error)
}
```

## TypeScript Support

All hooks are fully typed with TypeScript interfaces for parameters and return values. This provides excellent IDE support and compile-time error checking.

## Examples

See the `use-news-platform-example.ts` file for a comprehensive example of how to use all the hooks together in a real application.

## Contributing

When adding new hooks:
1. Follow the existing naming convention
2. Include proper TypeScript types
3. Add error handling and loading states
4. Include JSDoc comments
5. Update this README with usage examples
