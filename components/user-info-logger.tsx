"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"

export function UserInfoLogger() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") {
      console.log("🔄 Session is loading...")
      return
    }

    if (status === "authenticated" && session?.user) {
      console.log("✅ User is authenticated!")
      console.log("📧 User email:", session.user.email)
      console.log("👤 User name:", session.user.name)
      console.log("🆔 User ID:", session.user.id)
      console.log("💰 Wallet address:", session.user.walletAddress)
      console.log("📊 Full session data:", session)
    } else if (status === "unauthenticated") {
      console.log("❌ User is not authenticated")
    }
  }, [session, status])

  return null // This component doesn't render anything
}
