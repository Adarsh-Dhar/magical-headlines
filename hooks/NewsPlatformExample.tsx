import React, { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useNewsPlatformExample } from './use-news-platform-example'

export function NewsPlatformExample() {
  const {
    selectedNewsAccount,
    selectedMarket,
    selectedOracle,
    createNewsStory,
    createMarket,
    tradeTokens,
    setupOracle,
    addOracleAuthority,
    updateSummary,
    delegateToRollup,
    undelegateFromRollup,
    commitRollupState,
    newsAccount,
    market,
    oracle,
    whitelistedAuthority,
    calculateTradeCost,
    getCurrentPrice,
    getMarketStats,
    bondingCurve,
    isLoading,
  } = useNewsPlatformExample()

  const [headline, setHeadline] = useState('')
  const [arweaveLink, setArweaveLink] = useState('')
  const [initialSupply, setInitialSupply] = useState(1000000)
  const [curveType, setCurveType] = useState<'linear' | 'exponential' | 'logarithmic'>('linear')
  const [tradeAmount, setTradeAmount] = useState(1000)
  const [summaryLink, setSummaryLink] = useState('')
  const [oracleAuthority, setOracleAuthority] = useState('')

  const handlePublishNews = async () => {
    if (!headline || !arweaveLink) return

    const result = await createNewsStory(headline, arweaveLink, initialSupply)
    if (result) {
      console.log('News published:', result.newsAccount.toString())
    }
  }

  const handleCreateMarket = async () => {
    if (!selectedNewsAccount) return

    // You would need to get the mint address from the news account
    // For this example, we'll assume it's available
    const mint = new PublicKey('11111111111111111111111111111111') // Placeholder

    const result = await createMarket(selectedNewsAccount, mint, curveType)
    if (result) {
      console.log('Market created:', result.market.toString())
    }
  }

  const handleBuyTokens = async () => {
    if (!selectedMarket) return

    const mint = new PublicKey('11111111111111111111111111111111') // Placeholder
    const result = await tradeTokens(selectedMarket, mint, tradeAmount, true)
    if (result) {
      console.log('Tokens bought:', result.transactionSignature)
    }
  }

  const handleSellTokens = async () => {
    if (!selectedMarket) return

    const mint = new PublicKey('11111111111111111111111111111111') // Placeholder
    const result = await tradeTokens(selectedMarket, mint, tradeAmount, false)
    if (result) {
      console.log('Tokens sold:', result.transactionSignature)
    }
  }

  const handleSetupOracle = async () => {
    const result = await setupOracle()
    if (result) {
      console.log('Oracle setup:', result.oracle.toString())
    }
  }

  const handleAddAuthority = async () => {
    if (!selectedOracle || !oracleAuthority) return

    const authority = new PublicKey(oracleAuthority)
    const result = await addOracleAuthority(selectedOracle, authority)
    if (result) {
      console.log('Authority added:', result.whitelist.toString())
    }
  }

  const handleUpdateSummary = async () => {
    if (!selectedNewsAccount || !oracleAuthority || !summaryLink) return

    const authority = new PublicKey(oracleAuthority)
    const result = await updateSummary(selectedNewsAccount, authority, summaryLink)
    if (result) {
      console.log('Summary updated:', result.transactionSignature)
    }
  }

  const marketStats = getMarketStats()
  const currentPrice = getCurrentPrice()
  const buyCost = calculateTradeCost(tradeAmount, true)
  const sellRefund = calculateTradeCost(tradeAmount, false)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">News Platform Example</h1>

      {/* Publish News Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Publish News Story</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Arweave Link"
            value={arweaveLink}
            onChange={(e) => setArweaveLink(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Initial Supply"
            value={initialSupply}
            onChange={(e) => setInitialSupply(Number(e.target.value))}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handlePublishNews}
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Publish News
          </button>
        </div>
      </div>

      {/* Create Market Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Create Market</h2>
        <div className="space-y-4">
          <select
            value={curveType}
            onChange={(e) => setCurveType(e.target.value as any)}
            className="w-full p-2 border rounded"
          >
            <option value="linear">Linear</option>
            <option value="exponential">Exponential</option>
            <option value="logarithmic">Logarithmic</option>
          </select>
          <button
            onClick={handleCreateMarket}
            disabled={isLoading || !selectedNewsAccount}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Create Market
          </button>
        </div>
      </div>

      {/* Trading Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Trade Tokens</h2>
        <div className="space-y-4">
          <input
            type="number"
            placeholder="Amount"
            value={tradeAmount}
            onChange={(e) => setTradeAmount(Number(e.target.value))}
            className="w-full p-2 border rounded"
          />
          <div className="flex space-x-4">
            <button
              onClick={handleBuyTokens}
              disabled={isLoading || !selectedMarket}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Buy Tokens
            </button>
            <button
              onClick={handleSellTokens}
              disabled={isLoading || !selectedMarket}
              className="flex-1 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 disabled:opacity-50"
            >
              Sell Tokens
            </button>
          </div>
        </div>
      </div>

      {/* Oracle Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Oracle Management</h2>
        <div className="space-y-4">
          <button
            onClick={handleSetupOracle}
            disabled={isLoading}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Setup Oracle
          </button>
          <input
            type="text"
            placeholder="Oracle Authority Public Key"
            value={oracleAuthority}
            onChange={(e) => setOracleAuthority(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleAddAuthority}
            disabled={isLoading || !selectedOracle || !oracleAuthority}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Add Authority
          </button>
        </div>
      </div>

      {/* Update Summary Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Update Summary</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Summary Link"
            value={summaryLink}
            onChange={(e) => setSummaryLink(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleUpdateSummary}
            disabled={isLoading || !selectedNewsAccount || !oracleAuthority || !summaryLink}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50"
          >
            Update Summary
          </button>
        </div>
      </div>

      {/* Market Stats */}
      {marketStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Market Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current Supply</p>
              <p className="text-lg font-semibold">{marketStats.currentSupply.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">SOL Reserves</p>
              <p className="text-lg font-semibold">{(marketStats.solReserves / 1e9).toFixed(4)} SOL</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Volume</p>
              <p className="text-lg font-semibold">{(marketStats.totalVolume / 1e9).toFixed(4)} SOL</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Price</p>
              <p className="text-lg font-semibold">{(marketStats.currentPrice / 1e9).toFixed(6)} SOL</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Curve Type</p>
              <p className="text-lg font-semibold capitalize">{marketStats.curveType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Delegated</p>
              <p className="text-lg font-semibold">{marketStats.isDelegated ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trading Costs */}
      {buyCost && sellRefund && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Trading Costs</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Buy {tradeAmount} tokens</p>
              <p className="text-lg font-semibold">{(buyCost.cost / 1e9).toFixed(6)} SOL</p>
              <p className="text-sm text-gray-500">Avg: {(buyCost.averagePrice / 1e9).toFixed(6)} SOL</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sell {tradeAmount} tokens</p>
              <p className="text-lg font-semibold">{(sellRefund.cost / 1e9).toFixed(6)} SOL</p>
              <p className="text-sm text-gray-500">Avg: {(sellRefund.averagePrice / 1e9).toFixed(6)} SOL</p>
            </div>
          </div>
        </div>
      )}

      {/* News Account Display */}
      {newsAccount.data && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">News Account</h2>
          <div className="space-y-2">
            <p><strong>Headline:</strong> {newsAccount.data.headline}</p>
            <p><strong>Author:</strong> {newsAccount.data.authority.toString()}</p>
            <p><strong>Published:</strong> {new Date(newsAccount.data.publishedAt * 1000).toLocaleString()}</p>
            <p><strong>Arweave Link:</strong> <a href={newsAccount.data.arweaveLink} className="text-blue-500 hover:underline">{newsAccount.data.arweaveLink}</a></p>
            {newsAccount.data.summaryLink && (
              <p><strong>AI Summary:</strong> <a href={newsAccount.data.summaryLink} className="text-blue-500 hover:underline">{newsAccount.data.summaryLink}</a></p>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}
