import { NextRequest, NextResponse } from "next/server"
import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    // console.log('[arweave api] request received')
    const body: ArweaveUploadRequest = await request.json()
    const { content, tags = [], walletAddress } = body

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    try {
      // Prefer loading JWK from local key file; fallback to env variable
      const keyFilePath = path.join(
        process.cwd(),
        'arweave-key-xKXw5T4YdKwRCatwj-TDr0Imv1FP-Ogx3F2wD07mcQc.json'
      )

      let jwkString: string | undefined
      try {
        jwkString = await fs.promises.readFile(keyFilePath, 'utf8')
      } catch (_) {
        jwkString = process.env.ARWEAVE_JWK
      }

      if (!jwkString) {
        return NextResponse.json(
          { success: false, error: 'Missing Arweave JWK (key file or ARWEAVE_JWK env)' },
          { status: 500 }
        )
      }

      // Create signer and turbo client
      const signer = new ArweaveSigner(JSON.parse(jwkString))
      const turbo = TurboFactory.authenticated({ signer })

      // Merge default tags with provided tags
      const defaultTags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'TradeTheNews' },
        { name: 'Content-Type-News', value: 'news-article' },
        { name: 'Upload-Timestamp', value: Date.now().toString() },
        ...(walletAddress ? [{ name: 'Wallet-Address', value: walletAddress }] : []),
      ]
      const allTags = [...defaultTags, ...tags]

      const contentBuffer = Buffer.from(content, 'utf8')

      // Enforce a 20s timeout on the upload to avoid hanging
      // console.log('[arweave api] starting upload')
      const result = await Promise.race([
        turbo.uploadFile({
          fileStreamFactory: () => {
            const { Readable } = require('stream')
            return Readable.from(contentBuffer)
          },
          fileSizeFactory: () => contentBuffer.byteLength,
          dataItemOpts: {
            tags: allTags,
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timed out')), 20000)),
      ]) as { id: string }

      // console.log('[arweave api] upload complete')
      return NextResponse.json({
        success: true,
        id: result.id,
        url: `https://arweave.net/${result.id}`,
      })

    } catch (uploadError) {
      // console.error('Arweave upload error:', uploadError)
      return NextResponse.json(
        { 
          success: false, 
          error: uploadError instanceof Error ? uploadError.message : 'Upload failed' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    // console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
