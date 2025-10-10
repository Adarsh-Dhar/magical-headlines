"use client"

import { useCallback, useState } from "react"

export interface NewsContent {
  title: string
  content: string
  author: string
  category: string
  tags: string[]
  metadata?: Record<string, any>
}

interface ArweaveTag {
  name: string
  value: string
}

interface PublishResponse {
  success: boolean
  arweaveId?: string
  arweaveUrl?: string
  newsId?: string
  error?: string
}

export function usePublishNews() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const publishNews = useCallback(async (
    content: NewsContent,
    tags: ArweaveTag[] = [],
    walletAddress?: string,
  ): Promise<PublishResponse> => {
    setUploading(true)
    setUploadProgress(5)
    try {
      const res = await fetch(`/api/arweave/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // API expects content as string and walletAddress key
        body: JSON.stringify({ content: JSON.stringify(content), tags, walletAddress }),
      })
      setUploadProgress(60)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      setUploadProgress(100)
      return {
        success: true,
        arweaveId: data.id,
        arweaveUrl: data.url,
        newsId: data.newsId,
      }
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) }
    } finally {
      setTimeout(() => setUploading(false), 300)
    }
  }, [])

  return { publishNews, uploading, uploadProgress }
}


