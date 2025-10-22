"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, Code, BookOpen } from "lucide-react"

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-8 h-8 animate-spin mr-2" />
      <span>Loading API documentation...</span>
    </div>
  )
})

// Import Swagger UI CSS
import "swagger-ui-react/swagger-ui.css"

export default function APIDocsPage() {
  const [openApiSpec, setOpenApiSpec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOpenApiSpec = async () => {
      try {
        const response = await fetch("/api/v1/openapi")
        if (!response.ok) {
          throw new Error("Failed to fetch API specification")
        }
        const spec = await response.json()
        setOpenApiSpec(spec)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load API specification")
      } finally {
        setLoading(false)
      }
    }

    fetchOpenApiSpec()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Loading API documentation...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8">
            <div className="text-center text-red-500">
              <p className="text-lg font-semibold mb-2">Error loading documentation</p>
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">API Documentation</h1>
              <p className="text-lg text-muted-foreground">
                Magical Headlines API v1.0.0 - Real-time Financial Attention Feed
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-sm">
                <Code className="w-3 h-3 mr-1" />
                REST API
              </Badge>
              <Badge variant="outline" className="text-sm">
                <BookOpen className="w-3 h-3 mr-1" />
                OpenAPI 3.0
              </Badge>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">About This API</h2>
            <p className="text-muted-foreground mb-4">
              The Magical Headlines API provides real-time, financially-weighted attention data by ranking 
              news markets based on trading volume. Designed for institutional clients including hedge funds, 
              media companies, and trading bots.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Key Features</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Top 10 trending markets by volume</li>
                  <li>• Real-time market data and statistics</li>
                  <li>• Comprehensive market metadata</li>
                  <li>• 1-minute response caching</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Use Cases</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Hedge fund trading strategies</li>
                  <li>• Media attention analysis</li>
                  <li>• Automated trading bots</li>
                  <li>• Market sentiment tracking</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/api/v1/openapi" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  OpenAPI Spec
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/v1/trending" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Try API
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Swagger UI */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold">Interactive API Documentation</h2>
            <p className="text-sm text-muted-foreground">
              Use the "Try it out" buttons to test API endpoints directly in your browser
            </p>
          </div>
          <div className="swagger-ui-wrapper">
            {openApiSpec && (
              <SwaggerUI
                spec={openApiSpec}
                docExpansion="list"
                defaultModelsExpandDepth={2}
                defaultModelExpandDepth={2}
                displayRequestDuration={true}
                tryItOutEnabled={true}
                requestInterceptor={(request) => {
                  // Add any custom request headers or modifications here
                  return request
                }}
                responseInterceptor={(response) => {
                  // Add any custom response handling here
                  return response
                }}
                onComplete={() => {
                  // Custom styling for better integration
                  const style = document.createElement('style')
                  style.textContent = `
                    .swagger-ui .topbar { display: none; }
                    .swagger-ui .info { margin: 20px 0; }
                    .swagger-ui .info .title { color: hsl(var(--foreground)); }
                    .swagger-ui .scheme-container { background: hsl(var(--muted)); }
                    .swagger-ui .opblock.opblock-get { border-color: hsl(var(--primary)); }
                    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: hsl(var(--primary)); }
                    .swagger-ui .btn.execute { background-color: hsl(var(--primary)); }
                    .swagger-ui .btn.execute:hover { background-color: hsl(var(--primary) / 0.9); }
                  `
                  document.head.appendChild(style)
                }}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
