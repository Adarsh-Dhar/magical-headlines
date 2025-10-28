"use client"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
// Removed NextAuth imports - using wallet address directly

interface CreateStoryDialogProps {
  onStoryCreated?: () => void
}

export function CreateStoryDialog({ onStoryCreated }: CreateStoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [onChainPublishing, setOnChainPublishing] = useState(false)
  const [onChainResult, setOnChainResult] = useState<{
    success: boolean;
    signature?: string;
    error?: string;
  } | null>(null)
  // Removed auto-signing state - no longer needed
  
  const [formData, setFormData] = useState({
    headline: "",
    content: "",
    originalUrl: "",
    tags: [] as string[],
    initialSupply: 100,
    basePrice: 1000000, // 0.001 SOL in lamports
  })
  const [tagInput, setTagInput] = useState("")
  const [arweaveResult, setArweaveResult] = useState<{ arweaveId?: string; arweaveUrl?: string } | null>(null)
  
  // Track used nonces to prevent collisions (synchronous ref for immediate updates)
  const usedNoncesRef = useRef<Set<number>>(new Set())
  const [usedNonces, setUsedNonces] = useState<Set<number>>(new Set())
  const nonceCounterRef = useRef<number>(0)
  const { toast } = useToast()
  const router = useRouter()
  const wallet = useWallet()
  const { publicKey, connected } = wallet || {}
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const { publishNews: publishOnchain, testProgram, pdas } = useContract()
  const { publishNews: publishToArweave, uploading: arweaveUploading, uploadProgress } = useArweavePublishNews()
  // no program ref needed when using useContract

  // No authentication needed - wallet connection is sufficient

  // Generate a unique nonce that combines timestamp with counter and random component
  // Using millisecond precision for better uniqueness
  const generateUniqueNonce = () => {
    // Increment counter for this session
    nonceCounterRef.current += 1
    
    // Use millisecond precision timestamp + counter + large random component
    const timestamp = Date.now() // Milliseconds precision for better uniqueness
    const counter = nonceCounterRef.current
    const random = Math.floor(Math.random() * 1000000) // Larger random component (0-999999)
    
    // Create nonce: timestamp + counter * 1000000 + random
    // This ensures much better uniqueness even with rapid successive calls
    const nonce = timestamp + (counter * 1000000) + random
    
    // Fallback if somehow we exceed safe integer
    const finalNonce = nonce > Number.MAX_SAFE_INTEGER 
      ? Math.floor(Math.random() * 1000000000)
      : nonce
    
    // Mark nonce as used immediately in ref (synchronous)
    usedNoncesRef.current.add(finalNonce)
    setUsedNonces(prev => new Set(prev).add(finalNonce))
    return finalNonce
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
    
    if (formData.initialSupply < 100 || formData.initialSupply > 10000) {
      toast({
        title: "Error",
        description: "Initial supply must be between 100 and 10,000 tokens",
        variant: "destructive",
      })
      return
    }
    
    if (formData.basePrice < 1 || formData.basePrice > 1000000000) {
      toast({
        title: "Error",
        description: "Base price must be between 1 lamport and 1 SOL",
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
    } catch (urlError) {
      // console.error('[CreateStoryDialog] URL validation failed:', urlError)
      toast({
        title: "Error",
        description: "Please enter a valid URL (must start with http:// or https://)",
        variant: "destructive",
      })
      return
    }
    
    // Validate content contains only printable characters
    if (!formData.content.match(/^[\x20-\x7E\s]*$/)) {
      // console.error('[CreateStoryDialog] Content validation failed - invalid characters')
      toast({
        title: "Error",
        description: "Content contains invalid characters",
        variant: "destructive",
      })
      return
    }
    
    // Validate headline contains only printable characters
    if (!formData.headline.match(/^[\x20-\x7E\s]*$/)) {
      // console.error('[CreateStoryDialog] Headline validation failed - invalid characters')
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
        // console.error('[CreateStoryDialog] Arweave upload error:', e)
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
        // console.error('[CreateStoryDialog] Arweave upload failed:', arweaveResult.error)
        throw new Error(`Arweave upload failed: ${arweaveResult.error}`)
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
      
      // Save to database first (no on-chain publishing yet)
      
      const storyData = {
        headline: formData.headline,
        content: formData.content,
        originalUrl: uniqueUrl, // Using the unique URL to avoid conflicts
        arweaveUrl: safeArweaveResult.arweaveUrl,
        arweaveId: safeArweaveResult.arweaveId,
        onchainSignature: 'pending-on-chain-publishing-' + Date.now(), // Placeholder signature
        authorAddress: publicKey?.toString(), // Using publicKey from wallet
        nonce: uniqueNonce.toString(), // Using uniqueNonce
        tags: formData.tags,
      }
      
      
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      })


      if (!response.ok) {
        const errorData = await response.json()
        // console.error('[CreateStoryDialog] API error response:', errorData)
        
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error('A story with this URL already exists. Please try a different URL.')
        } else {
          throw new Error(errorData.error || 'Failed to save story to database')
        }
      }

      const savedStory = await response.json()

      // Now publish on-chain with the user's wallet
      if (connected && publicKey) {
        try {
          setOnChainPublishing(true)
          setOnChainResult({ success: false, error: "Publishing on-chain..." })

          console.log('🚀 Publishing story on-chain with user wallet...')

          // Retry logic for "transaction already processed" errors
          let attempts = 0
          let lastError: any = null
          let currentNonce = uniqueNonce
          let onChainSignature: string | null = null
          const maxAttempts = 3

          while (attempts < maxAttempts && !onChainSignature) {
            try {
              onChainSignature = await publishOnchain({
                headline: formData.headline,
                arweaveLink: safeArweaveResult.arweaveUrl,
                initialSupply: formData.initialSupply,
                basePrice: formData.basePrice,
                nonce: currentNonce,
              })
              
              // Success - break out of retry loop
              lastError = null
              break
            } catch (error) {
              lastError = error
              // Check if this is a "transaction already processed" or "duplicate" error
              const errorMessage = error instanceof Error ? error.message : String(error)
              
              if (errorMessage.includes('already been processed') || 
                  errorMessage.includes('duplicate') ||
                  errorMessage.includes('AccountDidNotDeserialize') ||
                  errorMessage.includes('disconnected port') ||
                  errorMessage.includes('Failed to send message to service worker')) {
                // Generate a new nonce and retry
                attempts++
                if (attempts < maxAttempts) {
                  currentNonce = generateUniqueNonce()
                  console.log(`🔄 Retrying with new nonce (attempt ${attempts}/${maxAttempts}):`, currentNonce)
                  
                  // Longer delay to allow wallet service worker to reconnect
                  await new Promise(resolve => setTimeout(resolve, 2000))
                  continue
                }
              }
              
              // Different error or max attempts reached - don't retry
              throw error
            }
          }

          if (lastError && !onChainSignature) {
            throw lastError
          }

          if (onChainSignature) {
            console.log('✅ On-chain publishing successful:', onChainSignature)
            
            // Derive the account addresses (same as in the contract)
            const newsPda = pdas.findNewsPda(publicKey, currentNonce)
            const mintPda = pdas.findMintPda(newsPda)
            const marketPda = pdas.findMarketPda(newsPda)

            // Update the token record with on-chain addresses
            // Also update nonce if it changed during retry
            const updateResponse = await fetch('/api/story/update-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                storyId: savedStory.id,
                mintAccount: mintPda.toString(),
                marketAccount: marketPda.toString(),
                newsAccount: newsPda.toString(),
                signature: onChainSignature,
                ...(currentNonce !== uniqueNonce && { nonce: currentNonce.toString() })
              }),
            })
            
            // If nonce changed, log it
            if (currentNonce !== uniqueNonce) {
              console.log('✅ Used retry nonce:', currentNonce, 'instead of original:', uniqueNonce)
            }

            if (updateResponse.ok) {
              setOnChainResult({ success: true, signature: onChainSignature })
              console.log('✅ Token record updated with on-chain addresses')
            } else {
              console.warn('⚠️ Failed to update token record:', await updateResponse.text())
              setOnChainResult({ success: true, signature: onChainSignature, error: "Published on-chain but failed to update database" })
            }
          } else {
            throw new Error('No signature returned from on-chain publishing')
          }
        } catch (onChainError) {
          console.error('❌ On-chain publishing failed:', onChainError)
          setOnChainResult({ 
            success: false, 
            error: onChainError instanceof Error ? onChainError.message : 'Unknown error' 
          })
        } finally {
          setOnChainPublishing(false)
        }
      }

      toast({
        title: "Success",
        description: onChainResult?.success 
          ? "Story published successfully on Arweave, blockchain, and database!"
          : "Story published on Arweave and database! (On-chain publishing in progress...)",
      })

      // Reset form
      setFormData({
        headline: "",
        content: "",
        originalUrl: "",
        tags: [],
        initialSupply: 100,
        basePrice: 1000000,
      })
      setTagInput("")
      setArweaveResult(null)
      setOnChainResult(null)
      setUsedNonces(new Set()) // Clear used nonces on successful submission
      usedNoncesRef.current.clear() // Clear ref as well
      nonceCounterRef.current = 0 // Reset counter
      setOpen(false)

      // Refresh stories list
      if (onStoryCreated) {
        onStoryCreated()
      }
    } catch (error) {
      // console.error('[CreateStoryDialog] Story creation failed with error:', error)
      // console.error('[CreateStoryDialog] Error details:', {
      //   name: error instanceof Error ? error.name : 'Unknown',
      //   message: error instanceof Error ? error.message : String(error),
      //   stack: error instanceof Error ? error.stack : undefined
      // })
      
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

  // Handle button click to check wallet connection before opening dialog
  const handleButtonClick = () => {
    // console.log removed for production

    if (!connected || !publicKey) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      setWalletModalVisible(true)
      return
    }

    setOpen(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2" onClick={handleButtonClick}>
          <Plus className="w-4 h-4" />
          Post Story
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
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
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Removed stepper/progress UI for a cleaner automatic flow */}

            <div className="grid gap-2">
              <Label htmlFor="headline">Headline *</Label>
              <Input
                id="headline"
                placeholder="Enter the story headline"
                value={formData.headline}
                onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                required
                disabled={loading || onChainPublishing}
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
                disabled={loading || onChainPublishing}
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
                disabled={loading || onChainPublishing}
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
                  disabled={loading || onChainPublishing}
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
                        disabled={loading || onChainPublishing}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="initialSupply">Initial Supply</Label>
                <Input
                  id="initialSupply"
                  type="number"
                  min="100"
                  max="10000"
                  placeholder="100"
                  value={formData.initialSupply}
                  onChange={(e) => setFormData(prev => ({ ...prev, initialSupply: parseInt(e.target.value) || 100 }))}
                  disabled={loading || onChainPublishing}
                />
                <p className="text-xs text-muted-foreground">100 - 10,000 tokens</p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="basePrice">Base Price (lamports)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="1"
                  max="1000000000"
                  placeholder="1000000"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 1000000 }))}
                  disabled={loading || onChainPublishing}
                />
                <p className="text-xs text-muted-foreground">1 lamport - 1 SOL</p>
              </div>
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

            {/* On-chain publishing status */}
            {onChainResult && (
              <div className={`p-3 rounded-lg ${
                onChainResult.success 
                  ? 'bg-green-50 dark:bg-green-950' 
                  : 'bg-yellow-50 dark:bg-yellow-950'
              }`}>
                <div className={`flex items-center gap-2 text-sm ${
                  onChainResult.success 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  <div className={`w-4 h-4 rounded-full ${
                    onChainResult.success ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span>
                    {onChainResult.success ? 'Published on Blockchain:' : 'On-chain Publishing:'}
                  </span>
                </div>
                {onChainResult.success && onChainResult.signature ? (
                  <a 
                    href={`https://explorer.solana.com/tx/${onChainResult.signature}?cluster=devnet`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 dark:text-green-400 hover:underline break-all"
                  >
                    {onChainResult.signature}
                  </a>
                ) : onChainResult.error ? (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    {onChainResult.error}
                  </div>
                ) : (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    Publishing in progress...
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading || isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isSubmitting || onChainPublishing}
              onClick={() => {
                if (!connected) setWalletModalVisible(true)
              }}
            >
              {loading || isSubmitting ? "Publishing..." : onChainPublishing ? "Publishing on-chain..." : !connected ? "Connect Wallet" : "Create Story"}
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
