"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUpIcon, TrendingDownIcon, ArrowLeftIcon, ExternalLinkIcon, WalletIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useContract } from "@/lib/use-contract"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

interface Story {
  id: string
  headline: string
  content: string
  originalUrl: string
  arweaveUrl: string
  arweaveId: string
  onchainSignature: string
  authorAddress?: string
  nonce?: string
  onMarket: boolean
  createdAt: string
  updatedAt: string
  submitter: {
    id: string
    name: string | null
    email: string | null
    walletAddress: string
  }
  tags: Array<{
    id: string
    name: string
  }>
  token: {
    id: string
    price: number
    priceChange24h: number
    volume24h: number
    marketCap: number
    newsAccount?: string
    mint?: string
    market?: string
  } | null
}

export default function StoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const storyId = params.id as string
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const contract = useContract()
  const { buy, sell, pdas, findActualNewsAccount, estimateBuyCost } = contract || {}
  
  // Debug contract availability
  useEffect(() => {
    console.log('Contract hook result:', {
      contract: !!contract,
      buy: typeof buy,
      sell: typeof sell,
      pdas: !!pdas,
      pdasKeys: pdas ? Object.keys(pdas) : []
    })
  }, [contract, buy, sell, pdas])
  
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Trading state
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [isTrading, setIsTrading] = useState(false)
  const [tradingError, setTradingError] = useState<string | null>(null)
  const [tradingSuccess, setTradingSuccess] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null)
  const [isRequestingAirdrop, setIsRequestingAirdrop] = useState(false)

  useEffect(() => {
    if (storyId) {
      fetchStory()
    }
  }, [storyId])

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (publicKey) {
        try {
          const balance = await connection.getBalance(publicKey)
          setWalletBalance(balance / 1e9) // Convert lamports to SOL
        } catch (error) {
          console.error('Error fetching wallet balance:', error)
        }
      }
    }
    
    fetchWalletBalance()
  }, [publicKey, connection])

  // Estimate buy cost when amount changes
  useEffect(() => {
    const estimateCost = async () => {
      if (buyAmount && estimateBuyCost && story?.authorAddress && story?.nonce && pdas) {
        try {
          const amount = parseInt(buyAmount)
          if (amount > 0) {
            // Derive the news account PDA using author address and nonce
            console.log('Deriving news account from author and nonce:', {
              authorAddress: story.authorAddress,
              nonce: story.nonce
            })
            const authorAddress = new PublicKey(story.authorAddress)
            const nonce = parseInt(story.nonce)
            const newsAccountPubkey = pdas.findNewsPda(authorAddress, nonce)
            const marketPda = pdas.findMarketPda(newsAccountPubkey)
            
            console.log('Derived PDAs:', {
              newsAccount: newsAccountPubkey.toString(),
              market: marketPda.toString()
            })
            
            if (marketPda) {
              const cost = await estimateBuyCost(marketPda, amount)
              console.log(`Estimated cost for ${amount} tokens: ${cost} SOL`)
              setEstimatedCost(cost)
            }
          }
        } catch (error) {
          console.error('Error estimating cost:', error)
          setEstimatedCost(null)
        }
      } else {
        setEstimatedCost(null)
      }
    }
    
    estimateCost()
  }, [buyAmount, estimateBuyCost, story?.authorAddress, story?.nonce, pdas])

  const requestAirdrop = async () => {
    if (!publicKey) return
    
    setIsRequestingAirdrop(true)
    try {
      console.log('Requesting airdrop for:', publicKey.toString())
      const signature = await connection.requestAirdrop(publicKey, 1e9) // 1 SOL
      await connection.confirmTransaction(signature)
      console.log('Airdrop successful:', signature)
      
      // Refresh wallet balance
      const balance = await connection.getBalance(publicKey)
      setWalletBalance(balance / 1e9)
      
      setTradingSuccess('Airdrop successful! You now have 1 SOL for testing.')
    } catch (error) {
      console.error('Airdrop failed:', error)
      setTradingError('Airdrop failed. Please try again.')
    } finally {
      setIsRequestingAirdrop(false)
    }
  }

  const fetchStory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/story?id=${storyId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Story not found')
        }
        throw new Error('Failed to fetch story')
      }
      const data = await response.json()
      setStory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async () => {
    console.log('Buy button clicked')
    
    if (!story?.token) {
      setTradingError('Story has no token available for trading')
      return
    }

    if (!connected || !publicKey) {
      setTradingError('Please connect your wallet to trade')
      return
    }

    if (typeof buy !== 'function' || !pdas) {
      setTradingError('Contract functions not available. Please try refreshing the page.')
      return
    }

    const amount = parseFloat(buyAmount)
    if (isNaN(amount) || amount <= 0) {
      setTradingError('Please enter a valid amount greater than 0')
      return
    }

    try {
      setIsTrading(true)
      setTradingError(null)
      setTradingSuccess(null)

      console.log('Starting buy transaction...', { amount, storyId: story.id })

      // Check if we have the required onchain data
      if (!story.authorAddress || !story.nonce) {
        throw new Error('Story missing onchain data (authorAddress or nonce). Cannot derive correct account addresses.')
      }
      
      // Derive the actual news account PDA using the stored author address and nonce
      const authorAddress = new PublicKey(story.authorAddress)
      const nonce = parseInt(story.nonce)
      
      if (!pdas.findNewsPda || !pdas.findMarketPda || !pdas.findMintPda) {
        throw new Error('PDA helper functions not available')
      }
      
      // Try to find the actual news account address
      let newsPda
      if (findActualNewsAccount) {
        try {
          newsPda = await findActualNewsAccount(authorAddress, nonce)
          console.log('Found actual news account:', newsPda.toString())
        } catch (error) {
          console.error('Error finding actual news account:', error)
          // Fallback to derived address
          newsPda = pdas.findNewsPda(authorAddress, nonce)
          console.log('Using derived news account:', newsPda.toString())
        }
      } else {
        newsPda = pdas.findNewsPda(authorAddress, nonce)
        console.log('Using derived news account (no findActualNewsAccount):', newsPda.toString())
      }
      
      const marketPda = pdas.findMarketPda(newsPda)
      const mintPda = pdas.findMintPda(newsPda)

      console.log('PDAs derived:', { 
        newsPda: newsPda.toString(), 
        marketPda: marketPda.toString(), 
        mintPda: mintPda.toString() 
      })
      
      console.log('Story data:', {
        authorAddress: story.authorAddress,
        nonce: story.nonce,
        onchainSignature: story.onchainSignature
      })
      
      // Debug: Let's see what the actual news account address should be
      const expectedNewsPda = pdas.findNewsPda(authorAddress, nonce)
      console.log('Expected news PDA:', expectedNewsPda.toString())
      console.log('Derived news PDA:', newsPda.toString())
      console.log('Are they equal?', expectedNewsPda.equals(newsPda))

      if (typeof buy !== 'function') {
        throw new Error('Buy function is not available')
      }

      console.log('Attempting buy with amount:', amount)
      
      // Calculate estimated cost before transaction
      const estimatedCost = await estimateBuyCost(marketPda, amount)
      console.log(`Estimated cost for ${amount} tokens: ${estimatedCost} SOL`)
      
      // Check wallet balance
      if (publicKey) {
        const balance = await connection.getBalance(publicKey)
        const balanceSOL = balance / 1e9
        console.log(`Current wallet balance: ${balance} lamports = ${balanceSOL} SOL`)
        
        // Validate sufficient funds
        if (estimatedCost && estimatedCost > balanceSOL) {
          throw new Error(`Insufficient funds. You need ${estimatedCost.toFixed(6)} SOL but only have ${balanceSOL.toFixed(4)} SOL`)
        }
      }
      
      const signature = await buy({
        market: marketPda,
        mint: mintPda,
        newsAccount: newsPda,
        amount: amount
      })

      console.log('Buy transaction successful:', signature)
      setTradingSuccess(`Successfully bought ${amount} tokens! Transaction: ${signature}`)
      setBuyAmount("")
      
      // Refresh story data to get updated token info
      await fetchStory()
    } catch (err) {
      console.error('Buy transaction failed:', err)
      
      // Log transaction details if available
      if (err && typeof err === 'object' && 'transactionLogs' in err) {
        console.log('Transaction logs:', (err as any).transactionLogs)
      }
      if (err && typeof err === 'object' && 'programErrorStack' in err) {
        console.log('Program error stack:', (err as any).programErrorStack)
      }
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to buy tokens'
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.includes('Blockhash not found')) {
        errorMessage = 'Transaction timed out. Please try again.'
      } else if (errorMsg.includes('InsufficientFunds')) {
        errorMessage = 'Insufficient funds for this transaction.'
      } else if (errorMsg.includes('owner does not match')) {
        errorMessage = 'Token authority mismatch. Please refresh and try again.'
      } else if (errorMsg) {
        errorMessage = errorMsg
      }
      
      setTradingError(errorMessage)
    } finally {
      setIsTrading(false)
    }
  }

  const handleSell = async () => {
    console.log('Sell button clicked')
    
    if (!story?.token) {
      setTradingError('Story has no token available for trading')
      return
    }

    if (!connected || !publicKey) {
      setTradingError('Please connect your wallet to trade')
      return
    }

    if (typeof sell !== 'function' || !pdas) {
      setTradingError('Contract functions not available. Please try refreshing the page.')
      return
    }

    const amount = parseFloat(sellAmount)
    if (isNaN(amount) || amount <= 0) {
      setTradingError('Please enter a valid amount greater than 0')
      return
    }

    try {
      setIsTrading(true)
      setTradingError(null)
      setTradingSuccess(null)

      console.log('Starting sell transaction...', { amount, storyId: story.id })

      // Check if we have the required onchain data
      if (!story.authorAddress || !story.nonce) {
        throw new Error('Story missing onchain data (authorAddress or nonce). Cannot derive correct account addresses.')
      }
      
      // Derive the actual news account PDA using the stored author address and nonce
      const authorAddress = new PublicKey(story.authorAddress)
      const nonce = parseInt(story.nonce)
      
      if (!pdas.findNewsPda || !pdas.findMarketPda || !pdas.findMintPda) {
        throw new Error('PDA helper functions not available')
      }
      
      // Try to find the actual news account address
      let newsPda
      if (findActualNewsAccount) {
        try {
          newsPda = await findActualNewsAccount(authorAddress, nonce)
          console.log('Found actual news account (sell):', newsPda.toString())
        } catch (error) {
          console.error('Error finding actual news account (sell):', error)
          // Fallback to derived address
          newsPda = pdas.findNewsPda(authorAddress, nonce)
          console.log('Using derived news account (sell):', newsPda.toString())
        }
      } else {
        newsPda = pdas.findNewsPda(authorAddress, nonce)
        console.log('Using derived news account (sell, no findActualNewsAccount):', newsPda.toString())
      }
      
      const marketPda = pdas.findMarketPda(newsPda)
      const mintPda = pdas.findMintPda(newsPda)

      console.log('PDAs derived (sell):', { 
        newsPda: newsPda.toString(), 
        marketPda: marketPda.toString(), 
        mintPda: mintPda.toString() 
      })
      
      console.log('Story data (sell):', {
        authorAddress: story.authorAddress,
        nonce: story.nonce,
        onchainSignature: story.onchainSignature
      })
      
      // Debug: Let's see what the actual news account address should be
      const expectedNewsPda = pdas.findNewsPda(authorAddress, nonce)
      console.log('Expected news PDA (sell):', expectedNewsPda.toString())
      console.log('Derived news PDA (sell):', newsPda.toString())
      console.log('Are they equal (sell)?', expectedNewsPda.equals(newsPda))

      if (typeof sell !== 'function') {
        throw new Error('Sell function is not available')
      }

      // Calculate estimated refund before transaction
      const estimatedRefund = await estimateBuyCost(marketPda, amount) // Same calculation for sell refund
      console.log(`Estimated refund for ${amount} tokens: ${estimatedRefund} SOL`)

      const signature = await sell({
        market: marketPda,
        mint: mintPda,
        newsAccount: newsPda,
        amount: amount
      })

      console.log('Sell transaction successful:', signature)
      setTradingSuccess(`Successfully sold ${amount} tokens! Transaction: ${signature}`)
      setSellAmount("")
      
      // Refresh story data to get updated token info
      await fetchStory()
    } catch (err) {
      console.error('Sell transaction failed:', err)
      setTradingError(err instanceof Error ? err.message : 'Failed to sell tokens')
    } finally {
      setIsTrading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading story...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error: {error || 'Story not found'}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.back()}>Go Back</Button>
                <Button variant="outline" onClick={fetchStory}>Try Again</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const token = story.token
  const isPriceUp = token ? token.priceChange24h > 0 : false
  const priceChange = token ? Math.abs(token.priceChange24h) : 0
  const price = token ? token.price : 0
  const volume = token ? token.volume24h : 0
  const marketCap = token ? token.marketCap : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </Button>
            <Link href="/marketplace">
              <Button variant="outline" size="sm">
                All Stories
              </Button>
            </Link>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4 leading-tight">{story.headline}</h1>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">By</span>
                  <span className="font-medium">{story.submitter.name || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{new Date(story.createdAt).toLocaleDateString()}</span>
                </div>
                {story.tags.length > 0 && (
                  <div className="flex gap-1">
                    {story.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                    {story.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{story.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href={story.originalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLinkIcon className="w-4 h-4" />
                  Original Article
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={story.arweaveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLinkIcon className="w-4 h-4" />
                  Arweave
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Story Content */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Story Content</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {story.content}
                </p>
              </div>
            </Card>

            {/* Blockchain Data */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Blockchain Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Onchain Signature:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {story.onchainSignature.slice(0, 16)}...{story.onchainSignature.slice(-8)}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Arweave ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {story.arweaveId}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Story ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {story.id}
                  </code>
                </div>
              </div>
            </Card>
          </div>

          {/* Trading Sidebar */}
          <div className="space-y-6">
            {/* Token Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Token Information</h2>
              {token ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">${price.toFixed(2)}</div>
                    <div className={`flex items-center justify-center gap-1 text-sm ${
                      isPriceUp ? "text-green-500" : "text-red-500"
                    }`}>
                      {isPriceUp ? (
                        <TrendingUpIcon className="w-4 h-4" />
                      ) : (
                        <TrendingDownIcon className="w-4 h-4" />
                      )}
                      {priceChange.toFixed(1)}% (24h)
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Volume (24h):</span>
                      <span className="text-sm font-medium">${(volume / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Market Cap:</span>
                      <span className="text-sm font-medium">${(marketCap / 1000).toFixed(1)}K</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t space-y-4">
                    {!connected ? (
                      <div className="text-center py-4">
                        <WalletIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">Connect your wallet to trade</p>
                        <Button variant="outline" size="sm" disabled>
                          Connect Wallet
                        </Button>
                      </div>
                    ) : !contract ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">Contract not available</p>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                          Refresh Page
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Buy Section */}
                        <div className="space-y-2">
                          <Label htmlFor="buyAmount" className="text-sm font-medium">Buy Tokens</Label>
                          <div className="flex gap-2">
                            <Input
                              id="buyAmount"
                              type="number"
                              placeholder="Amount to buy"
                              value={buyAmount}
                              onChange={(e) => setBuyAmount(e.target.value)}
                              min="0"
                              step="0.01"
                              disabled={isTrading}
                            />
                            <Button 
                              onClick={handleBuy}
                              disabled={isTrading || !buyAmount}
                              className="px-6"
                            >
                              {isTrading ? "Buying..." : "Buy"}
                            </Button>
                          </div>
                        </div>

                        {/* Sell Section */}
                        <div className="space-y-2">
                          <Label htmlFor="sellAmount" className="text-sm font-medium">Sell Tokens</Label>
                          <div className="flex gap-2">
                            <Input
                              id="sellAmount"
                              type="number"
                              placeholder="Amount to sell"
                              value={sellAmount}
                              onChange={(e) => setSellAmount(e.target.value)}
                              min="0"
                              step="0.01"
                              disabled={isTrading}
                            />
                            <Button 
                              onClick={handleSell}
                              disabled={isTrading || !sellAmount}
                              variant="outline"
                              className="px-6"
                            >
                              {isTrading ? "Selling..." : "Sell"}
                            </Button>
                          </div>
                        </div>

                        {/* Debug Information */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs">
                          <p className="font-medium mb-2">Debug Info:</p>
                          <p>Wallet Connected: {connected ? 'Yes' : 'No'}</p>
                          <p>Public Key: {publicKey ? publicKey.toString().slice(0, 8) + '...' : 'None'}</p>
                          <p>Wallet Balance: {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : 'Loading...'}</p>
                          <p>Estimated Cost: {estimatedCost !== null ? `${estimatedCost.toFixed(6)} SOL` : 'N/A'}</p>
                          <p>Story Token: {story?.token ? 'Available' : 'None'}</p>
                          <p>Contract Available: {contract ? 'Yes' : 'No'}</p>
                          <p>Buy Function: {typeof buy === 'function' ? 'Available' : 'None'}</p>
                          <p>Sell Function: {typeof sell === 'function' ? 'Available' : 'None'}</p>
                          <p>PDA Helpers: {pdas ? 'Available' : 'None'}</p>
                          <p>Buy Amount: {buyAmount || 'Empty'}</p>
                          <p>Sell Amount: {sellAmount || 'Empty'}</p>
                          <p>Is Trading: {isTrading ? 'Yes' : 'No'}</p>
                        </div>

                        {/* Trading Messages */}
                        {tradingError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{tradingError}</p>
                          </div>
                        )}
                        
                        {/* Insufficient Funds Warning */}
                        {estimatedCost && walletBalance && estimatedCost > walletBalance && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-600 mb-2">
                              ⚠️ Insufficient funds! You need {estimatedCost.toFixed(6)} SOL but only have {walletBalance.toFixed(4)} SOL
                            </p>
                            <Button 
                              onClick={requestAirdrop}
                              disabled={isRequestingAirdrop}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              {isRequestingAirdrop ? "Requesting..." : "Get 1 SOL (Test)"}
                            </Button>
                          </div>
                        )}
                        {tradingSuccess && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-600">{tradingSuccess}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No token data available</p>
                </div>
              )}
            </Card>

            {/* Story Stats */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Story Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={story.onMarket ? "default" : "secondary"}>
                    {story.onMarket ? "On Market" : "Not on Market"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">{new Date(story.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated:</span>
                  <span className="text-sm">{new Date(story.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
