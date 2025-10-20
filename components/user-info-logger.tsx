"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useEffect } from "react"

export function UserInfoLogger() {
  const { connected, publicKey } = useWallet()

  useEffect(() => {
    // Only log in development mode to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      if (connected && publicKey) {
      } else {
      }
    }
  }, [connected, publicKey])

  return null // This component doesn't render anything
}
