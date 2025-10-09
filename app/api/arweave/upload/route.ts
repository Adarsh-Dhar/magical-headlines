import { NextRequest, NextResponse } from "next/server"

export interface ArweaveUploadRequest {
  content: string
  tags?: Array<{ name: string; value: string }>
  walletAddress?: string
}

export interface ArweaveUploadResponse {
  success: boolean
  id?: string
  url?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ArweaveUploadRequest = await request.json()
    const { content, tags = [], walletAddress } = body

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    try {
      // For now, we'll simulate a successful upload
      // In production, you would implement proper Arweave upload
      const mockId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Create default tags
      const defaultTags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'TradeTheNews' },
        { name: 'Content-Type-News', value: 'news-article' },
        { name: 'Upload-Timestamp', value: Date.now().toString() },
        ...(walletAddress ? [{ name: 'Wallet-Address', value: walletAddress }] : []),
        ...tags,
      ]

      // Log the upload details for debugging
      console.log('Arweave upload simulation:', {
        contentLength: content.length,
        tags: defaultTags,
        walletAddress,
      })

      return NextResponse.json({
        success: true,
        id: mockId,
        url: `https://arweave.net/${mockId}`,
      })

    } catch (uploadError) {
      console.error('Arweave upload error:', uploadError)
      return NextResponse.json(
        { 
          success: false, 
          error: uploadError instanceof Error ? uploadError.message : 'Upload failed' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
