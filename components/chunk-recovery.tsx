"use client"

import React, { useEffect } from "react"

// Minimal client-side guard to auto-recover from Webpack/Next chunk load errors
export function ChunkRecovery() {
  useEffect(() => {
    const reloadWithBust = () => {
      try {
        const url = new URL(window.location.href)
        url.searchParams.set("v", Date.now().toString())
        window.location.replace(url.toString())
      } catch {
        window.location.reload()
      }
    }

    const isChunkError = (err: unknown) => {
      if (!err) return false
      const message = String((err as any)?.message || err)
      const name = String((err as any)?.name || "")
      return (
        name.includes("ChunkLoadError") ||
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk") ||
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed")
      )
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) {
        event.preventDefault()
        reloadWithBust()
      }
    }

    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.error) || isChunkError(event.message)) {
        event.preventDefault()
        reloadWithBust()
      }
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection)
    window.addEventListener("error", onError)
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
      window.removeEventListener("error", onError)
    }
  }, [])

  return null
}


