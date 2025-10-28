import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, TrendingDownIcon, HeartIcon, Share2Icon, CheckIcon, UserPlusIcon, ExternalLinkIcon } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useWallet } from "@solana/wallet-adapter-react"

interface NewsCardProps {
  story: {
    id: string
    headline: string
    summary: string
    summaryLink?: string
    tags: string[]
    attentionScore: number
    tokenPrice: number
    priceChange: number
    volume24h: number
    timestamp: string
    authorWallet?: string
  }
}

export function NewsCard({ story }: NewsCardProps) {
  const isPriceUp = story.priceChange > 0
  const { publicKey } = useWallet()
  const [likeCount, setLikeCount] = useState<number>(0)
  const [liked, setLiked] = useState<boolean>(false)
  const [isSharing, setIsSharing] = useState<boolean>(false)
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const [subscriberCount, setSubscriberCount] = useState<number>(0)

  // Fetch like count and status
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const wallet = publicKey?.toString()
        const res = await fetch(`/api/likes?storyId=${story.id}${wallet ? `&walletAddress=${wallet}` : ''}`)
        if (res.ok) {
          const data = await res.json()
          setLikeCount(data.count || 0)
          setLiked(!!data.liked)
        }
      } catch {}
    }
    fetchLikes()
  }, [story.id, publicKey])

  // Fetch subscription count and status (if author wallet known)
  useEffect(() => {
    const fetchSubs = async () => {
      if (!story.authorWallet) return
      try {
        const res = await fetch(`/api/subscriptions?authorWallet=${story.authorWallet}${publicKey ? `&subscriberWallet=${publicKey.toString()}` : ''}`)
        if (res.ok) {
          const data = await res.json()
          setIsSubscribed(!!data.subscribed)
          setSubscriberCount(data.count || 0)
        }
      } catch {}
    }
    fetchSubs()
  }, [story.authorWallet, publicKey])

  const isAuthor = !!(publicKey && story.authorWallet && story.authorWallet === publicKey.toString())

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold leading-tight text-balance">{story.headline}</h3>
            <p className="text-sm text-muted-foreground text-pretty">{story.summary}</p>
            {story.summaryLink && (
              <a 
                href={story.summaryLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-500 hover:text-blue-600 underline"
              >
                <ExternalLinkIcon className="w-3 h-3 mr-1" />
                Read AI Summary
              </a>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {story.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Trading Info */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Token Price</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">${story.tokenPrice}</span>
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${isPriceUp ? "text-green-500" : "text-red-500"}`}
                >
                  {isPriceUp ? <TrendingUpIcon className="w-4 h-4" /> : <TrendingDownIcon className="w-4 h-4" />}
                  {Math.abs(story.priceChange)}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
              <p className="text-lg font-bold">${(story.volume24h / 1000).toFixed(1)}K</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant={liked ? "default" : "outline"}
                size="icon-sm"
                aria-label={liked ? "Unlike" : "Like"}
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
              >
                <HeartIcon className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              </Button>
              <span className="text-xs tabular-nums">{likeCount}</span>
            </div>

            <Button
              variant={isSubscribed ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                try {
                  if (!publicKey || !story.authorWallet || isAuthor) return
                  const res = await fetch('/api/subscriptions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authorWallet: story.authorWallet, subscriberWallet: publicKey.toString() })
                  })
                  if (res.ok) {
                    const data = await res.json()
                    setIsSubscribed(!!data.subscribed)
                    setSubscriberCount(data.count || 0)
                  }
                } catch {}
              }}
              className="min-w-24"
              disabled={isAuthor}
            >
              <UserPlusIcon className="w-4 h-4" />
              <span className="text-sm">{isAuthor ? 'Author' : (isSubscribed ? 'Subscribed' : 'Subscribe')}</span>
              {story.authorWallet ? (
                <span className="text-xs text-muted-foreground ml-1">{subscriberCount}</span>
              ) : null}
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Share"
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
            </Button>

            <Link href={`/${story.id}`}>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Trade
              </Button>
            </Link>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">{story.timestamp}</p>
      </div>
    </Card>
  )
}
