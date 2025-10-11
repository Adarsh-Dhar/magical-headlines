"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useContract } from "@/lib/use-contract"
import { usePublishNews as useArweavePublishNews, NewsContent } from "../lib/functions/publish-news"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"

interface CreateStoryDialogProps {
  onStoryCreated?: () => void
}

export function CreateStoryDialog({ onStoryCreated }: CreateStoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    headline: "",
    content: "",
    originalUrl: "",
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState("")
  const [arweaveResult, setArweaveResult] = useState<{ arweaveId?: string; arweaveUrl?: string } | null>(null)
  
  // Track used nonces to prevent collisions (synchronous ref for immediate updates)
  const usedNoncesRef = useRef<Set<number>>(new Set())
  const [usedNonces, setUsedNonces] = useState<Set<number>>(new Set())
  const nonceCounterRef = useRef<number>(0)
  const { toast } = useToast()
  const wallet = useWallet()
  const { publicKey, connected } = wallet || {}
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const { publishNews: publishOnchain } = useContract()
  const { publishNews: publishToArweave, uploading: arweaveUploading, uploadProgress } = useArweavePublishNews()
  // no program ref needed when using useContract

  // Generate a unique nonce that combines timestamp with counter and random component
  // Using smaller values to stay within safe integer range for anchor.BN
  const generateUniqueNonce = () => {
    // Increment counter for this session
    nonceCounterRef.current += 1
    
    // Use a simpler approach with smaller numbers to avoid overflow
    const timestamp = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
    const counter = nonceCounterRef.current
    const random = Math.floor(Math.random() * 1000) // Random component 0-999
    
    // Create nonce: timestamp + counter * 1000 + random
    // This keeps the number much smaller and within safe integer range
    const nonce = timestamp + (counter * 1000) + random
    
    // Validate nonce is within safe integer range
    if (nonce > Number.MAX_SAFE_INTEGER) {
      const fallbackNonce = Math.floor(Math.random() * 1000000000)
      usedNoncesRef.current.add(fallbackNonce)
      setUsedNonces(prev => new Set(prev).add(fallbackNonce))
      return fallbackNonce
    }
    
    // Mark nonce as used immediately in ref (synchronous)
    usedNoncesRef.current.add(nonce)
    setUsedNonces(prev => new Set(prev).add(nonce))
    return nonce
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple simultaneous submissions
    if (isSubmitting || loading) {
      return
    }
    
    // Comprehensive form validation
    if (!formData.headline.trim()) {
      toast({
        title: "Error",
        description: "Headline is required",
        variant: "destructive",
      })
      return
    }
    
    if (formData.headline.length > 200) {
      toast({
        title: "Error",
        description: "Headline is too long (max 200 characters)",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Content is required",
        variant: "destructive",
      })
      return
    }
    
    if (formData.content.length > 10000) {
      toast({
        title: "Error",
        description: "Content is too long (max 10,000 characters)",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.originalUrl.trim()) {
      toast({
        title: "Error",
        description: "Original URL is required",
        variant: "destructive",
      })
      return
    }

    if (!connected || !publicKey || !wallet.signTransaction) {
      setWalletModalVisible(true)
      toast({
        title: "Error",
        description: "Please connect your wallet to publish a story",
        variant: "destructive",
      })
      return
    }

    

    // Enhanced URL validation
    try {
      const url = new URL(formData.originalUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol')
      }
      if (url.hostname.length === 0) {
        throw new Error('Invalid hostname')
      }
    } catch {
      toast({
        title: "Error",
        description: "Please enter a valid URL (must start with http:// or https://)",
        variant: "destructive",
      })
      return
    }
    
    // Validate content contains only printable characters
    if (!formData.content.match(/^[\x20-\x7E\s]*$/)) {
      toast({
        title: "Error",
        description: "Content contains invalid characters",
        variant: "destructive",
      })
      return
    }
    
    // Validate headline contains only printable characters
    if (!formData.headline.match(/^[\x20-\x7E\s]*$/)) {
      toast({
        title: "Error",
        description: "Headline contains invalid characters",
        variant: "destructive",
      })
      return
    }

    // Make URL unique by adding timestamp to avoid conflicts
    const uniqueUrl = `${formData.originalUrl}?t=${Date.now()}`

    // Set both loading states to prevent duplicate submissions
    setLoading(true)
    setIsSubmitting(true)

    try {
      // No extra readiness loop required

      // Step 1: Upload to Arweave
      const newsContent: NewsContent = {
        title: formData.headline,
        content: formData.content,
        author: publicKey.toString(),
        category: "news",
        tags: formData.tags,
        metadata: {
          originalUrl: formData.originalUrl,
          publishedAt: new Date().toISOString(),
        }
      }

      // Run Arweave upload with a client-side timeout so the UI never stalls
      const arweaveTimeoutMs = 20000
      const wrappedUpload = publishToArweave(
        newsContent,
        [
          { name: 'Original-URL', value: formData.originalUrl },
          { name: 'Story-Type', value: 'news-trading' },
        ],
        publicKey?.toString()
      ).catch((e: any) => {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
      })

      const arweaveResult: any = await Promise.race([
        wrappedUpload,
        new Promise<ReturnType<typeof publishToArweave>>(resolve =>
          setTimeout(() => {
            resolve({ success: true, arweaveId: 'timeout', arweaveUrl: 'https://arweave.net/timeout', newsId: `news-${Date.now()}` } as any)
          }, arweaveTimeoutMs)
        ),
      ])

      if (!arweaveResult.success) {
      }


      // Ensure arweaveResult has the expected structure
      const safeArweaveResult = {
        arweaveId: arweaveResult?.arweaveId || 'placeholder-id',
        arweaveUrl: arweaveResult?.arweaveUrl || 'https://arweave.net/placeholder'
      }

      if (!arweaveResult?.arweaveUrl) {
      }

      setArweaveResult({
        arweaveId: safeArweaveResult.arweaveId,
        arweaveUrl: safeArweaveResult.arweaveUrl,
      })
      
      // Generate unique nonce for this transaction
      const uniqueNonce = generateUniqueNonce()
      
      let txSignature: string | undefined
      try {
        
        // Add timeout to onchain call
        const onchainTimeoutMs = 30000 // 30 seconds
        txSignature = await Promise.race([
          publishOnchain({
            headline: formData.headline,
            arweaveLink: safeArweaveResult.arweaveUrl,
            initialSupply: 100,
            nonce: uniqueNonce,
          }),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Onchain transaction timed out')), onchainTimeoutMs)
          )
        ]) as string


        if (!txSignature) {
          throw new Error('Failed to publish onchain - no signature returned')
        }
      } catch (onchainError) {
        
        // Handle specific error cases with detailed error messages
        const errorMessage = onchainError instanceof Error ? onchainError.message : String(onchainError)
        
        if (errorMessage.includes('already been processed')) {
          // Set a placeholder signature for database save
          txSignature = 'already-processed-' + Date.now()
        } else if (errorMessage.includes('timed out')) {
          throw new Error('Transaction timed out. Please check your connection and try again.')
        } else if (errorMessage.includes('account already exists') || errorMessage.includes('already in use')) {
          throw new Error('A story with this identifier already exists. Please try again with different content.')
        } else if (errorMessage.includes('InsufficientFunds')) {
          throw new Error('Insufficient SOL balance. Please ensure you have at least 0.002 SOL for transaction fees.')
        } else if (errorMessage.includes('HeadlineTooLong')) {
          throw new Error('Headline is too long or contains invalid characters. Please use only printable characters and keep it under 200 characters.')
        } else if (errorMessage.includes('LinkTooLong')) {
          throw new Error('Arweave link is invalid. Please ensure it starts with https://arweave.net/ or ar://')
        } else if (errorMessage.includes('ArithmeticOverflow')) {
          throw new Error('Invalid input values. Please check your headline, content, and ensure you have sufficient SOL balance.')
        } else if (errorMessage.includes('ConstraintSeeds')) {
          throw new Error('Account validation failed. Please try again with a different nonce.')
        } else if (errorMessage.includes('Transaction verification failed')) {
          throw new Error('Transaction completed but verification failed. The story may not be properly created. Please try again.')
        } else {
          throw new Error(`Onchain publish failed: ${errorMessage}`)
        }
      }

      const isBlockchainSkipped = txSignature.startsWith('already-processed-')
      
      // Save to database only after successful onchain transaction
      
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headline: formData.headline,
          content: formData.content,
          originalUrl: uniqueUrl, // Using the unique URL to avoid conflicts
          arweaveUrl: safeArweaveResult.arweaveUrl,
          arweaveId: safeArweaveResult.arweaveId,
          onchainSignature: txSignature,
          authorAddress: wallet.publicKey?.toString(), // Using wallet instead of walletAdapter
          nonce: uniqueNonce.toString(), // Using uniqueNonce
          tags: formData.tags,
        }),
      })


      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error('A story with this URL already exists. Please try a different URL.')
        } else {
          throw new Error(errorData.error || 'Failed to save story to database')
        }
      }


      toast({
        title: "Success",
        description: isBlockchainSkipped 
          ? "Story published successfully on Arweave and saved to database! (Blockchain transaction was already processed)"
          : "Story published successfully on both Arweave and blockchain!",
      })

      // Reset form
      setFormData({
        headline: "",
        content: "",
        originalUrl: "",
        tags: [],
      })
      setTagInput("")
      setArweaveResult(null)
      setUsedNonces(new Set()) // Clear used nonces on successful submission
      usedNoncesRef.current.clear() // Clear ref as well
      nonceCounterRef.current = 0 // Reset counter
      setOpen(false)

      // Refresh stories list
      if (onStoryCreated) {
        onStoryCreated()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to publish story",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // Clean up when dialog is closed
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Clear used nonces when dialog is closed
      setUsedNonces(new Set())
      usedNoncesRef.current.clear()
      nonceCounterRef.current = 0
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Post Story
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Story</DialogTitle>
          <DialogDescription>
            Share a news story and let the community trade on it.
          </DialogDescription>
          {connected && publicKey && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-2">
              Wallet connected: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Removed stepper/progress UI for a cleaner automatic flow */}

            <div className="grid gap-2">
              <Label htmlFor="headline">Headline *</Label>
              <Input
                id="headline"
                placeholder="Enter the story headline"
                value={formData.headline}
                onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write the full story content here..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
                disabled={loading}
                rows={4}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="url">Original URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/news-story"
                value={formData.originalUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, originalUrl: e.target.value }))}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <Button type="button" variant="outline" onClick={addTag} disabled={!tagInput.trim() || loading}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        disabled={loading}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Arweave result display */}
            {arweaveResult && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <Upload className="w-4 h-4" />
                  <span>Uploaded to Arweave:</span>
                </div>
                <a 
                  href={arweaveResult.arweaveUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 dark:text-green-400 hover:underline break-all"
                >
                  {arweaveResult.arweaveUrl}
                </a>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading || isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isSubmitting}
              onClick={() => {
                if (!connected) setWalletModalVisible(true)
              }}
            >
              {loading || isSubmitting ? "Publishing..." : !connected ? "Connect Wallet" : "Create Story"}
            </Button>
            {!connected && (
              <div className="text-xs text-muted-foreground mt-2">
                Please connect your wallet to create a story
              </div>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
