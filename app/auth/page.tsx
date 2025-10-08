"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const emailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

const walletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().optional(),
})

export default function AuthPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { data: session, status } = useSession()

  // Log user information when component mounts or session changes
  useEffect(() => {
    if (status === "loading") {
      console.log("Session is loading...")
      return
    }

    if (status === "authenticated" && session?.user) {
      console.log("User is authenticated!")
      console.log("User email:", session.user.email)
      console.log("User name:", session.user.name)
      console.log("User ID:", session.user.id)
      console.log("Wallet address:", session.user.walletAddress)
      console.log("Full session data:", session)
      
      // Redirect authenticated users to home page
      router.push("/")
    } else if (status === "unauthenticated") {
      console.log("User is not authenticated")
    }
  }, [session, status, router])

  async function handleEmailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const parsed = emailSchema.safeParse({
      email: formData.get("email"),
      name: formData.get("name") || undefined,
    })
    
    if (!parsed.success) {
      setIsLoading(false)
      return
    }
    
    try {
      const result = await signIn("credentials", {
        email: parsed.data.email,
        name: parsed.data.name,
        redirect: false,
      })
      
      if (result?.ok) {
        router.push("/")
      } else {
        console.error("Sign in failed:", result?.error)
        alert(`Sign in failed: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Sign in error:", error)
      alert(`Sign in error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleWalletSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const parsed = walletSchema.safeParse({
      walletAddress: formData.get("walletAddress"),
      name: formData.get("name") || undefined,
    })
    
    if (!parsed.success) {
      setIsLoading(false)
      return
    }
    
    try {
      const result = await signIn("credentials", {
        walletAddress: parsed.data.walletAddress,
        name: parsed.data.name,
        redirect: false,
      })
      
      if (result?.ok) {
        router.push("/")
      } else {
        console.error("Wallet sign in failed:", result?.error)
        alert(`Wallet sign in failed: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Wallet sign in error:", error)
      alert(`Wallet sign in error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-xl grid md:grid-cols-2 gap-6">
          <Card className="border-muted/40">
            <CardHeader>
              <CardTitle className="text-xl">Sign in with Email</CardTitle>
              <CardDescription>We’ll create your account if it doesn’t exist.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display name (optional)</label>
                  <Input name="name" type="text" placeholder="Satoshi" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-muted/40">
            <CardHeader>
              <CardTitle className="text-xl">Sign in with Wallet</CardTitle>
              <CardDescription>Paste your EVM wallet to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWalletSignIn} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Wallet address</label>
                  <Input name="walletAddress" inputMode="text" placeholder="0x..." required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display name (optional)</label>
                  <Input name="name" type="text" placeholder="Whale42" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


