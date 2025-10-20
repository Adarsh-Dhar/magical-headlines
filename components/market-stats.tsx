"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUpIcon, UsersIcon, DollarSignIcon, ActivityIcon } from "lucide-react"
import { useContract } from "@/lib/use-contract"

type StatItem = {
  label: string
  value: string
  change: string
  icon: any
  positive: boolean
}

function formatNumberCompact(value: number): string {
  try {
    return Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
  } catch {
    return value.toString()
  }
}

export function MarketStats() {
  const [activeStories, setActiveStories] = useState<number | null>(null)
  const [totalTraders, setTotalTraders] = useState<number | null>(null)
  const [totalVolume24h, setTotalVolume24h] = useState<number | null>(null)
  const [realTimeTotalVolumeSOL, setRealTimeTotalVolumeSOL] = useState<number | null>(null)
  const contract = useContract()
  const { pdas, getMarketDelegationStatus } = contract || {}

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setActiveStories(data.activeStories ?? null)
        setTotalTraders(data.totalTraders ?? null)
        setTotalVolume24h(data.totalVolume24h ?? null)
      } catch {
        // no-op; keep placeholders
      }
    }
    fetchStats()
    // Disable periodic polling to reduce requests
    return () => {
      cancelled = true
    }
  }, [])

  // Compute live SOL total by summing on-chain market volumes for recent stories
  useEffect(() => {
    let cancelled = false
    const computeLiveTotal = async () => {
      if (!pdas || !getMarketDelegationStatus) return
      try {
        const res = await fetch("/api/story?limit=20", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const stories = (data?.stories || []) as Array<{ id: string; authorAddress?: string; nonce?: string }>

        // Batch in chunks to avoid RPC overload
        const batchSize = 4
        let total = 0
        for (let i = 0; i < stories.length; i += batchSize) {
          const batch = stories.slice(i, i + batchSize)
          const results = await Promise.all(batch.map(async (s) => {
            try {
              if (!s.authorAddress || !s.nonce) return 0
              const author = (await import("@solana/web3.js")).PublicKey
              const authorPk = new author(s.authorAddress)
              const nonceNum = parseInt(s.nonce)
              const newsPda = pdas.findNewsPda(authorPk, nonceNum)
              const marketPda = pdas.findMarketPda(newsPda)
              const status = await getMarketDelegationStatus(marketPda)
              const volLamports = Number(status?.totalVolume ?? 0)
              const volSOL = volLamports / 1e9
              return Number.isFinite(volSOL) ? volSOL : 0
            } catch {
              return 0
            }
          }))
          total += results.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0)
          if (i + batchSize < stories.length) {
            await new Promise((r) => setTimeout(r, 300))
          }
        }
        if (!cancelled) setRealTimeTotalVolumeSOL(total)
      } catch {
        // ignore
      }
    }
    computeLiveTotal()
    // Disable periodic polling for live total
    return () => { cancelled = true }
  }, [pdas, getMarketDelegationStatus])

  const stats: StatItem[] = useMemo(() => [
    {
      label: "Total Market Cap",
      value: "$12.4M",
      change: "+8.3%",
      icon: DollarSignIcon,
      positive: true,
    },
    {
      label: "Active Stories",
      value: activeStories == null ? "—" : formatNumberCompact(activeStories),
      change: "",
      icon: ActivityIcon,
      positive: true,
    },
    {
      label: "Total Traders",
      value: totalTraders == null ? "—" : formatNumberCompact(totalTraders),
      change: "",
      icon: UsersIcon,
      positive: true,
    },
    {
      label: "24h Volume",
      value: realTimeTotalVolumeSOL != null && realTimeTotalVolumeSOL > 0
        ? `${realTimeTotalVolumeSOL.toFixed(4)} SOL`
        : (totalVolume24h == null ? "—" : `${totalVolume24h.toFixed(4)} SOL`),
      change: "",
      icon: TrendingUpIcon,
      positive: true,
    },
  ], [activeStories, totalTraders, totalVolume24h, realTimeTotalVolumeSOL])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              {stat.change && (
                <span className={`text-xs font-medium ${stat.positive ? "text-green-500" : "text-red-500"}`}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        )
      })}
    </div>
  )
}
