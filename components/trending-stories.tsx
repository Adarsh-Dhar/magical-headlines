import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FlameIcon } from "lucide-react"
import { useContract } from "@/lib/use-contract"
import { PublicKey } from "@solana/web3.js"

interface Story {
  id: string
  headline: string
  authorAddress?: string
  nonce?: string
  tags: Array<{ id: string; name: string }>
}

export function TrendingStories() {
  const contract = useContract()
  const { pdas, getMarketDelegationStatus } = contract || {}

  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [isUpdating, setIsUpdating] = useState(false)

  const didInitialVolumeUpdateRef = useRef(false)

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/story")
      if (!res.ok) throw new Error("Failed to fetch stories")
      const data = await res.json()
      const fetched = data.stories || []
      setStories(fetched)
      // Perform a one-time volume update on mount if contract utils are ready
      if (!didInitialVolumeUpdateRef.current && pdas && typeof getMarketDelegationStatus === 'function' && fetched.length > 0) {
        didInitialVolumeUpdateRef.current = true
        void updateVolumesFor(fetched)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStories()
  }, [fetchStories])

  const updateVolumesFor = useCallback(async (sourceStories?: Story[]) => {
    if (!pdas || typeof getMarketDelegationStatus !== 'function') return
    if (isUpdating) return
    setIsUpdating(true)
    const nextVolumes: Record<string, number> = {}

    try {
      const base = sourceStories ?? stories
      const eligible = base.filter(s => s.authorAddress && s.nonce)
      const batchSize = 4
      for (let i = 0; i < eligible.length; i += batchSize) {
        const batch = eligible.slice(i, i + batchSize)
        await Promise.all(batch.map(async (story) => {
          try {
            const author = new PublicKey(story.authorAddress!)
            const nonceNum = parseInt(story.nonce!)
            const newsPda = pdas.findNewsPda(author, nonceNum)
            const marketPda = pdas.findMarketPda(newsPda)
            const status = await getMarketDelegationStatus(marketPda)
            const volSOL = Number(status.totalVolume) / 1e9
            if (volSOL > 0) nextVolumes[story.id] = volSOL
          } catch (_err) {
            // ignore individual failures
          }
        }))
        if (i + batchSize < eligible.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }
      setVolumes(nextVolumes)
    } finally {
      setIsUpdating(false)
    }
  }, [stories, pdas, getMarketDelegationStatus, isUpdating])

  // Removed periodic/automatic updates; volumes now update only once on mount (via fetchStories) and on manual refresh

  const trending = useMemo(() => {
    return stories
      .map(s => ({
        id: s.id,
        headline: s.headline,
        tags: s.tags,
        volume: volumes[s.id] ?? 0,
      }))
      .filter(item => item.volume > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)
  }, [stories, volumes])

  return (
    <Card className="p-6 sticky top-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FlameIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Trending Now</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => updateVolumesFor()} disabled={isUpdating || loading} className="h-8">
          {isUpdating ? "Updating..." : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-xs text-muted-foreground">Loading trending...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : trending.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">No trending stories yet</div>
      ) : (
        <div className="space-y-2">
          {trending.map((item, idx) => (
            <Link key={item.id} href={`/${item.id}`}>
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight mb-1 text-balance line-clamp-2">{item.headline}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Vol: {item.volume.toFixed(4)} SOL</span>
                    {stories.find(s => s.id === item.id)?.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag.id} variant="secondary" className="text-[10px]">{tag.name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link href="/">
        <Badge variant="outline" className="w-full mt-4 justify-center py-2">
          View All Trending
        </Badge>
      </Link>
    </Card>
  )
}
