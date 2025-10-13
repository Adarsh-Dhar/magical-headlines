"use client"

import { PriceChart } from "@/components/price-chart"
import { SimplePriceChart } from "@/components/simple-price-chart"
import { StaticPriceChart } from "@/components/static-price-chart"

// Test component to verify the price chart works
export function TestPriceChart() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Price Chart Test</h1>
      
      <div className="space-y-6">
        {/* Static chart that never reloads */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Static Chart (Never Reloads)</h2>
          <StaticPriceChart />
        </div>
        
        {/* Simple chart that always works */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Simple Chart (Always Works)</h2>
          <SimplePriceChart />
        </div>
        
        {/* Test with mock data */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Test Chart with Mock Data</h2>
          <PriceChart 
            tokenId="test-token-123"
            marketAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
            newsAccountAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
            mintAddress="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
            height={300}
            showVolume={false}
            liveUpdates={false}
          />
        </div>
      </div>
    </div>
  )
}
