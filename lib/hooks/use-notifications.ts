"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"

export type NotificationItem = {
  id?: string
  type: "NEW_STORY"
  storyId: string
  headline: string
  authorWallet?: string
  createdAt?: string
  read?: boolean
}

export function useNotifications(wallet: string | undefined) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const { toast } = useToast()
  const evtRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!wallet) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/notifications?wallet=${wallet}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setItems(data.notifications || [])
          setUnread(data.unreadCount || 0)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [wallet])

  useEffect(() => {
    if (!wallet) return
    const es = new EventSource(`/api/notifications/stream?wallet=${wallet}`)
    evtRef.current = es

    const onMessage = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as NotificationItem
        setItems((prev) => [{ ...payload, id: `temp-${Date.now()}` }, ...prev])
        setUnread((u) => u + 1)
        if (payload.type === "NEW_STORY") {
          toast({ title: "New story", description: payload.headline })
        }
      } catch {}
    }

    es.addEventListener("message", onMessage as EventListener)
    es.onerror = () => {}

    return () => {
      es.close()
      evtRef.current = null
    }
  }, [wallet])

  const markAllRead = async () => {
    if (!wallet) return
    try {
      const res = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, mark: "read" }),
      })
      if (res.ok) {
        setUnread(0)
        setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      }
    } catch {}
  }

  return { notifications: items, unread, markAllRead }
}


