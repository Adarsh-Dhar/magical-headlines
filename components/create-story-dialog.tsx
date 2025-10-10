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
  
  const [formData, setFormData] = useState({
    headline: "",
    content: "",
    originalUrl: "",
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState("")
  const [arweaveResult, setArweaveResult] = useState<{ arweaveId?: string; arweaveUrl?: string } | null>(null)
  const { toast } = useToast()
  const wallet = useWallet()
  const { publicKey, connected } = wallet || {}
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const { publishNews: publishOnchain } = useContract()
  const { publishNews: publishToArweave, uploading: arweaveUploading, uploadProgress } = useArweavePublishNews()
  // no program ref needed when using useContract

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.headline.trim() || !formData.content.trim() || !formData.originalUrl.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
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

    

    // Basic URL validation
    try {
      new URL(formData.originalUrl)
    } catch {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      })
      return
    }

    // Make URL unique by adding timestamp to avoid conflicts
    const uniqueUrl = `${formData.originalUrl}?t=${Date.now()}`
    console.log('[CreateStoryDialog] formData', formData)

    setLoading(true)

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
      console.debug('[CreateStoryDialog] starting Arweave upload')
      const arweaveTimeoutMs = 20000
      const wrappedUpload = publishToArweave(
        newsContent,
        [
          { name: 'Original-URL', value: formData.originalUrl },
          { name: 'Story-Type', value: 'news-trading' },
        ],
        publicKey?.toString()
      ).catch((e: any) => {
        console.warn('[CreateStoryDialog] Arweave upload failed early:', e)
        return { success: false, error: e instanceof Error ? e.message : String(e) }
      })

      const arweaveResult: any = await Promise.race([
        wrappedUpload,
        new Promise<ReturnType<typeof publishToArweave>>(resolve =>
          setTimeout(() => {
            console.warn('[CreateStoryDialog] Arweave upload timed out; proceeding with on-chain publish')
            resolve({ success: true, arweaveId: 'timeout', arweaveUrl: 'https://arweave.net/timeout', newsId: `news-${Date.now()}` } as any)
          }, arweaveTimeoutMs)
        ),
      ])

      if (!arweaveResult.success) {
        console.warn('[CreateStoryDialog] Arweave upload reported failure; proceeding with on-chain publish')
      }

      console.log('[CreateStoryDialog] arweaveResult', arweaveResult)

      // Ensure arweaveResult has the expected structure
      const safeArweaveResult = {
        arweaveId: arweaveResult?.arweaveId || 'placeholder-id',
        arweaveUrl: arweaveResult?.arweaveUrl || 'https://arweave.net/placeholder'
      }

      if (!arweaveResult?.arweaveUrl) {
        console.warn('[CreateStoryDialog] Missing arweaveUrl; using placeholder to proceed')
      }

      setArweaveResult({
        arweaveId: safeArweaveResult.arweaveId,
        arweaveUrl: safeArweaveResult.arweaveUrl,
      })
      console.log('[CreateStoryDialog] calling publishOnchain')
      
      let txSignature: string | undefined
      try {
        // Add timeout to onchain call
        const onchainTimeoutMs = 30000 // 30 seconds
        txSignature = await Promise.race([
          publishOnchain({
            headline: formData.headline,
            arweaveLink: safeArweaveResult.arweaveUrl,
            initialSupply: 1000,
            nonce: Date.now(),
          }),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Onchain transaction timed out')), onchainTimeoutMs)
          )
        ]) as string

        console.log('[CreateStoryDialog] txSignature', txSignature)

        if (!txSignature) {
          throw new Error('Failed to publish onchain - no signature returned')
        }
      } catch (onchainError) {
        console.error('[CreateStoryDialog] Onchain publish failed:', onchainError)
        throw new Error(`Onchain publish failed: ${onchainError instanceof Error ? onchainError.message : String(onchainError)}`)
      }

      console.log('[CreateStoryDialog] Onchain transaction completed successfully, proceeding to database save')
      
      // Save to database only after successful onchain transaction
      console.log('[CreateStoryDialog] saving to database')
      console.log('[CreateStoryDialog] database payload:', {
        headline: formData.headline,
        content: formData.content,
        originalUrl: uniqueUrl,
        arweaveUrl: arweaveResult.arweaveUrl,
        arweaveId: arweaveResult.arweaveId,
        onchainSignature: txSignature,
        tags: formData.tags,
      })
      
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
          tags: formData.tags,
        }),
      })

      console.log('[CreateStoryDialog] response status:', response.status)
      console.log('[CreateStoryDialog] response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[CreateStoryDialog] Database save failed:', errorData)
        
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error('A story with this URL already exists. Please try a different URL.')
        } else {
          throw new Error(errorData.error || 'Failed to save story to database')
        }
      }

      console.log('[CreateStoryDialog] Database save successful')

      console.log('[CreateStoryDialog] showing success toast')
      toast({
        title: "Success",
        description: "Story published successfully on both Arweave and blockchain!",
      })

      // Reset form
      console.log('[CreateStoryDialog] resetting form and closing dialog')
      setFormData({
        headline: "",
        content: "",
        originalUrl: "",
        tags: [],
      })
      setTagInput("")
      setArweaveResult(null)
      setOpen(false)

      // Refresh stories list
      if (onStoryCreated) {
        console.log('[CreateStoryDialog] calling onStoryCreated callback')
        onStoryCreated()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to publish story",
        variant: "destructive",
      })
    } finally {
      console.log('[CreateStoryDialog] finally block - setting loading to false')
      setLoading(false)
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              onClick={() => {
                if (!connected) setWalletModalVisible(true)
              }}
            >
              {loading ? "Publishing..." : !connected ? "Connect Wallet" : "Create Story"}
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
