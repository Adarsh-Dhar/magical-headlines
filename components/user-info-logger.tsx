"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"

export function UserInfoLogger() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") {
      return
    }

    if (status === "authenticated" && session?.user) {
      
    } else if (status === "unauthenticated") {
      
    }
  }, [session, status])

  return null // This component doesn't render anything
}
