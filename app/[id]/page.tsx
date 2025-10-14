"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUpIcon, TrendingDownIcon, ArrowLeftIcon, ExternalLinkIcon, WalletIcon, HeartIcon, MessageCircleIcon, Share2Icon, CheckIcon } from "lucide-react"
import { PriceChart } from "@/components/price-chart"
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
  summaryLink?: string
  submitter: {
    id: string
    name: string | null
    email?: string | null
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
  const { buy, sell, pdas, findActualNewsAccount, estimateBuyCost, getMarketDelegationStatus, listenForDelegationEvents } = contract || {}
  
  const [story, setStory] = useState<Story | null>(null)
  const [likeCount, setLikeCount] = useState<number>(0)
  const [liked, setLiked] = useState<boolean>(false)
  const [isSharing, setIsSharing] = useState<boolean>(false)
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const [subscriberCount, setSubscriberCount] = useState<number>(0)
  const [comments, setComments] = useState<Array<{ id: string; content: string; createdAt: string; user: { id: string; name: string | null; walletAddress: string } }>>([])
  const [commentText, setCommentText] = useState("")
  const [isPostingComment, setIsPostingComment] = useState(false)
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
  
  // Delegation status and events
  const [delegationStatus, setDelegationStatus] = useState<{
    isDelegated: boolean;
    rollupAuthority: string | null;
    currentSupply: number;
    totalVolume: number;
  } | null>(null)
  const [delegationEvents, setDelegationEvents] = useState<{
    autoDelegated: boolean;
    commitRecommended: boolean;
  }>({
    autoDelegated: false,
    commitRecommended: false,
  })

  useEffect(() => {
    if (storyId) {
      fetchStory()
    }
  }, [storyId])

  // Fetch likes for this story
  useEffect(() => {
    const fetchLikes = async () => {
      if (!storyId) return
      try {
        const wallet = publicKey?.toString()
        const res = await fetch(`/api/likes?storyId=${storyId}${wallet ? `&walletAddress=${wallet}` : ''}`)
        if (res.ok) {
          const data = await res.json()
          setLikeCount(data.count || 0)
          setLiked(!!data.liked)
        }
      } catch {}
    }
    fetchLikes()
  }, [storyId, publicKey])

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      if (!storyId) return
      try {
        const res = await fetch(`/api/comments?storyId=${storyId}&limit=50`)
        if (res.ok) {
          const data = await res.json()
          setComments(data.comments || [])
        }
      } catch {}
    }
    fetchComments()
  }, [storyId])

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (publicKey) {
        try {
          const balance = await connection.getBalance(publicKey)
          setWalletBalance(balance / 1e9)
        } catch (error) {
        }
      }
    }
    
    fetchWalletBalance()
  }, [publicKey, connection])

  // Fetch delegation status when story loads
  useEffect(() => {
    const fetchDelegationStatus = async () => {
      if (story?.authorAddress && story?.nonce && getMarketDelegationStatus && pdas) {
        try {
          const authorAddress = new PublicKey(story.authorAddress)
          const nonce = parseInt(story.nonce)
          const newsAccountPubkey = pdas.findNewsPda(authorAddress, nonce)
          const marketPda = pdas.findMarketPda(newsAccountPubkey)
          
          const status = await getMarketDelegationStatus(marketPda)
          setDelegationStatus({
            isDelegated: status.isDelegated,
            rollupAuthority: status.rollupAuthority?.toString() || null,
            currentSupply: Number(status.currentSupply),
            totalVolume: Number(status.totalVolume),
          })
        } catch (error) {
        }
      }
    }
    
    fetchDelegationStatus()
  }, [story?.authorAddress, story?.nonce, getMarketDelegationStatus, pdas])

  // Fetch subscription status & count
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!story?.submitter?.walletAddress) return
      try {
        const res = await fetch(`/api/subscriptions?authorWallet=${story.submitter.walletAddress}${publicKey ? `&subscriberWallet=${publicKey.toString()}` : ''}`)
        if (res.ok) {
          const data = await res.json()
          setIsSubscribed(!!data.subscribed)
          setSubscriberCount(data.count || 0)
        }
      } catch {}
    }
    fetchSubscription()
  }, [story?.submitter?.walletAddress, publicKey])

  // Set up event listeners for delegation events
  useEffect(() => {
    if (!listenForDelegationEvents) return

    const cleanup = listenForDelegationEvents(
      () => {
        setDelegationEvents(prev => ({ ...prev, autoDelegated: true }))
        if (story?.authorAddress && story?.nonce && getMarketDelegationStatus && pdas) {
          const authorAddress = new PublicKey(story.authorAddress)
          const nonce = parseInt(story.nonce)
          const newsAccountPubkey = pdas.findNewsPda(authorAddress, nonce)
          const marketPda = pdas.findMarketPda(newsAccountPubkey)
          getMarketDelegationStatus(marketPda).then(setDelegationStatus).catch(() => {})
        }
      },
      () => {
        setDelegationEvents(prev => ({ ...prev, commitRecommended: true }))
      }
    )

    return cleanup || undefined
  }, [listenForDelegationEvents, story?.authorAddress, story?.nonce, getMarketDelegationStatus, pdas])

  // Estimate buy cost when amount changes
  useEffect(() => {
    const estimateCost = async () => {
      if (buyAmount && estimateBuyCost && story?.authorAddress && story?.nonce && pdas) {
        try {
          const amount = parseInt(buyAmount)
          if (amount > 0) {
            const authorAddress = new PublicKey(story.authorAddress)
            const nonce = parseInt(story.nonce)
            const newsAccountPubkey = pdas.findNewsPda(authorAddress, nonce)
            const marketPda = pdas.findMarketPda(newsAccountPubkey)
            if (marketPda) {
              const cost = await estimateBuyCost(marketPda, amount)
              setEstimatedCost(cost)
            }
          }
        } catch (error) {
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
      const signature = await connection.requestAirdrop(publicKey, 1e9)
      await connection.confirmTransaction(signature)
      const balance = await connection.getBalance(publicKey)
      setWalletBalance(balance / 1e9)
      setTradingSuccess('Airdrop successful! You now have 1 SOL for testing.')
    } catch (error) {
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
      if (data.token?.newsAccount) {
        try {
          const newsAccountData = await fetch(`/api/news-account?address=${data.token.newsAccount}`)
          if (newsAccountData.ok) {
            const onChainData = await newsAccountData.json()
            data.summaryLink = onChainData.summaryLink
          }
        } catch (err) {
        }
      }
      setStory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async () => {
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
      if (!story.authorAddress || !story.nonce) {
        throw new Error('Story missing onchain data (authorAddress or nonce). Cannot derive correct account addresses.')
      }
      const authorAddress = new PublicKey(story.authorAddress)
      const nonce = parseInt(story.nonce)
      if (!pdas.findNewsPda || !pdas.findMarketPda || !pdas.findMintPda) {
        throw new Error('PDA helper functions not available')
      }
      let newsPda
      if (findActualNewsAccount) {
        try {
          newsPda = await findActualNewsAccount(authorAddress, nonce)
        } catch (error) {
          newsPda = pdas.findNewsPda(authorAddress, nonce)
        }
      } else {
        newsPda = pdas.findNewsPda(authorAddress, nonce)
      }
      const marketPda = pdas.findMarketPda(newsPda)
      const mintPda = pdas.findMintPda(newsPda)
      const estimatedCost = await estimateBuyCost!(marketPda, amount)
      if (publicKey) {
        const balance = await connection.getBalance(publicKey)
        const balanceSOL = balance / 1e9
        if (estimatedCost && estimatedCost > balanceSOL) {
          throw new Error(`Insufficient funds. You need ${estimatedCost.toFixed(6)} SOL but only have ${balanceSOL.toFixed(4)} SOL`)
        }
      }
      const signature = await buy!({
        market: marketPda,
        mint: mintPda,
        newsAccount: newsPda,
        amount: amount
      })
      setTradingSuccess(`Successfully bought ${amount} tokens! Transaction: ${signature}`)
      setBuyAmount("")
      await fetchStory()
    } catch (err) {
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
      if (!story.authorAddress || !story.nonce) {
        throw new Error('Story missing onchain data (authorAddress or nonce). Cannot derive correct account addresses.')
      }
      const authorAddress = new PublicKey(story.authorAddress)
      const nonce = parseInt(story.nonce)
      if (!pdas.findNewsPda || !pdas.findMarketPda || !pdas.findMintPda) {
        throw new Error('PDA helper functions not available')
      }
      let newsPda
      if (findActualNewsAccount) {
        try {
          newsPda = await findActualNewsAccount(authorAddress, nonce)
        } catch (error) {
          newsPda = pdas.findNewsPda(authorAddress, nonce)
        }
      } else {
        newsPda = pdas.findNewsPda(authorAddress, nonce)
      }
      const marketPda = pdas.findMarketPda(newsPda)
      const mintPda = pdas.findMintPda(newsPda)
      await sell!({
        market: marketPda,
        mint: mintPda,
        newsAccount: newsPda,
        amount: amount
      })
      setTradingSuccess(`Successfully sold ${amount} tokens!`)
      setSellAmount("")
      await fetchStory()
    } catch (err) {
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
  const isAuthor = !!(publicKey && story?.submitter?.walletAddress === publicKey.toString())

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
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
            <Link href="/">
              <Button variant="outline" size="sm">
                All Stories
              </Button>
            </Link>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4 leading-tight">{story.headline}</h1>
              {story.summaryLink && (
                <div className="mb-4">
                  <a 
                    href={story.summaryLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <ExternalLinkIcon className="w-4 h-4 mr-2" />
                    Read AI Summary
                  </a>
                </div>
              )}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">By</span>
                <span className="font-medium">{story.submitter.name || 'Anonymous'}</span>
                <Button
                  size="sm"
                  variant={isAuthor ? "secondary" : (isSubscribed ? "default" : "outline")}
                  onClick={async () => {
                    if (!publicKey || isAuthor) return
                    try {
                      const res = await fetch('/api/subscriptions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ authorWallet: story.submitter.walletAddress, subscriberWallet: publicKey.toString() })
                      })
                      if (res.ok) {
                        const data = await res.json()
                        setIsSubscribed(!!data.subscribed)
                        setSubscriberCount(data.count || 0)
                      }
                    } catch {}
                  }}
                  className="h-7 px-3 ml-2"
                  disabled={isAuthor}
                >
                  {isAuthor ? 'Author' : (isSubscribed ? 'Subscribed' : 'Subscribe')}
                </Button>
                <span className="text-xs text-muted-foreground">{subscriberCount}</span>
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
            
            <div className="flex gap-2">
              <Button
                variant={liked ? "default" : "outline"}
                size="sm"
                onClick={async () => {
                  try {
                    if (!publicKey) return
                    const res = await fetch('/api/likes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ storyId: story.id, walletAddress: publicKey.toString() })
                    })
                    if (res.ok) {
                      const data = await res.json()
                      setLiked(!!data.liked)
                      setLikeCount(data.count || 0)
                    }
                  } catch {}
                }}
                className="min-w-20"
              >
                <HeartIcon className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                <span className="text-sm">{likeCount}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const el = document.getElementById('comments')
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}>
                <MessageCircleIcon className="w-4 h-4" />
                Comments
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const shareUrl = `${window.location.origin}/${story.id}`
                    if (navigator.share) {
                      await navigator.share({ title: story.headline, url: shareUrl })
                    } else {
                      await navigator.clipboard.writeText(shareUrl)
                      setIsSharing(true)
                      setTimeout(() => setIsSharing(false), 1500)
                    }
                  } catch {}
                }}
              >
                {isSharing ? <CheckIcon className="w-4 h-4" /> : <Share2Icon className="w-4 h-4" />}
                {isSharing ? 'Copied' : 'Share'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {story.token ? (
              story.authorAddress && story.nonce && pdas ? (
                <PriceChart 
                  tokenId={story.token.id}
                  marketAddress={pdas.findMarketPda(pdas.findNewsPda(new PublicKey(story.authorAddress), parseInt(story.nonce))).toString()}
                  newsAccountAddress={pdas.findNewsPda(new PublicKey(story.authorAddress), parseInt(story.nonce)).toString()}
                  mintAddress={pdas.findMintPda(pdas.findNewsPda(new PublicKey(story.authorAddress), parseInt(story.nonce))).toString()}
                  height={400}
                  showVolume={true}
                  liveUpdates={false}
                  refreshInterval={0}
                />
              ) : (
                <PriceChart 
                  tokenId={story.token.id}
                  marketAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
                  newsAccountAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
                  mintAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
                  height={400}
                  showVolume={true}
                  liveUpdates={false}
                  refreshInterval={0}
                />
              )
            ) : (
              <PriceChart 
                tokenId={story.id}
                marketAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
                newsAccountAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
                mintAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
                height={400}
                showVolume={true}
                liveUpdates={false}
                refreshInterval={0}
              />
            )}

            <Card className="p-6" id="comments">
              <h2 className="text-xl font-semibold mb-4">Story Content</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {story.content}
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Comments</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={publicKey ? "Write a comment..." : "Connect wallet to comment"}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={!publicKey || isPostingComment}
                  />
                  <Button
                    onClick={async () => {
                      if (!publicKey || !commentText.trim() || !story) return
                      setIsPostingComment(true)
                      try {
                        const res = await fetch('/api/comments', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ storyId: story.id, walletAddress: publicKey.toString(), content: commentText.trim() })
                        })
                        if (res.ok) {
                          const created = await res.json()
                          setComments((prev) => [created, ...prev])
                          setCommentText("")
                        }
                      } catch {} finally {
                        setIsPostingComment(false)
                      }
                    }}
                    disabled={!publicKey || !commentText.trim() || isPostingComment}
                  >
                    {isPostingComment ? 'Posting...' : 'Post'}
                  </Button>
                </div>

                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-md border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-muted-foreground">
                            {c.user.name || c.user.walletAddress.slice(0, 6) + '...' + c.user.walletAddress.slice(-4)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

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

          <div className="space-y-6">
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
                    {delegationStatus && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Trading Status
                          </span>
                          <Badge variant={delegationStatus.isDelegated ? "default" : "secondary"}>
                            {delegationStatus.isDelegated ? "⚡ High-Speed" : "🐌 Base Layer"}
                          </Badge>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                          <p>Supply: {delegationStatus.currentSupply}/100 tokens</p>
                          <p>Volume: {(delegationStatus.totalVolume / 1e9).toFixed(4)} SOL</p>
                          {delegationStatus.isDelegated && (
                            <p>Authority: {delegationStatus.rollupAuthority?.slice(0, 8)}...</p>
                          )}
                        </div>
                      </div>
                    )}

                    {delegationEvents.autoDelegated && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                          <span>⚡</span>
                          <span>Market upgraded to high-speed trading!</span>
                        </div>
                      </div>
                    )}

                    {delegationEvents.commitRecommended && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                          <span>💾</span>
                          <span>State commit recommended for this market</span>
                        </div>
                      </div>
                    )}

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

                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs">
                          <p className="font-medium mb-2">Debug Info:</p>
                          <p>Wallet Connected: {connected ? 'Yes' : 'No'}</p>
                          <p>Public Key: {publicKey ? publicKey.toString().slice(0, 8) + '...' : 'None'}</p>
                          <p>Wallet Balance: {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : 'Loading...'}</p>
                          <p>Estimated Cost: {estimatedCost !== null ? `${estimatedCost.toFixed(6)} SOL` : 'N/A'}</p>
                          <p>Story Token: {story?.token ? 'Available' : 'None'}</p>
                          <p>Author Address: {story?.authorAddress || 'None'}</p>
                          <p>Nonce: {story?.nonce || 'None'}</p>
                          <p>Contract Available: {contract ? 'Yes' : 'No'}</p>
                          <p>Buy Function: {typeof buy === 'function' ? 'Available' : 'None'}</p>
                          <p>Sell Function: {typeof sell === 'function' ? 'Available' : 'None'}</p>
                          <p>PDA Helpers: {pdas ? 'Available' : 'None'}</p>
                          <p>Delegation Status: {delegationStatus ? (delegationStatus.isDelegated ? 'Delegated' : 'Not Delegated') : 'Loading...'}</p>
                          <p>Auto-Delegated Event: {delegationEvents.autoDelegated ? 'Yes' : 'No'}</p>
                          <p>Commit Recommended: {delegationEvents.commitRecommended ? 'Yes' : 'No'}</p>
                          <p>Buy Amount: {buyAmount || 'Empty'}</p>
                          <p>Sell Amount: {sellAmount || 'Empty'}</p>
                          <p>Is Trading: {isTrading ? 'Yes' : 'No'}</p>
                        </div>

                        {tradingError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{tradingError}</p>
                          </div>
                        )}
                        
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


