"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useEffect } from "react"

export function UserInfoLogger() {
  const { connected, publicKey } = useWallet()

  useEffect(() => {
    if (connected && publicKey) {
      console.log('[UserInfoLogger] Wallet connected:', publicKey.toString())
    } else {
      console.log('[UserInfoLogger] Wallet not connected')
    }
  }, [connected, publicKey])

  return null // This component doesn't render anything
}
