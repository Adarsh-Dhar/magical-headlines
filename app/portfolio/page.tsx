import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUpIcon, TrendingDownIcon, WalletIcon } from "lucide-react"

const portfolioHoldings = [
  { symbol: "NEWS-001", headline: "AI Breakthrough", amount: 150, avgPrice: 10.2, currentPrice: 12.45, pnl: 330.75 },
  { symbol: "NEWS-003", headline: "Climate Summit", amount: 200, avgPrice: 13.5, currentPrice: 15.67, pnl: 434.0 },
  { symbol: "NEWS-002", headline: "Markets Rally", amount: 100, avgPrice: 9.4, currentPrice: 8.92, pnl: -48.0 },
]

export default function PortfolioPage() {
  const totalValue = portfolioHoldings.reduce((sum, h) => sum + h.amount * h.currentPrice, 0)
  const totalPnL = portfolioHoldings.reduce((sum, h) => sum + h.pnl, 0)
  const pnlPercentage = ((totalPnL / (totalValue - totalPnL)) * 100).toFixed(2)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Portfolio</h1>
          <p className="text-lg text-muted-foreground">Track your holdings and performance</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <WalletIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {totalPnL >= 0 ? (
                  <TrendingUpIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDownIcon className="w-5 h-5 text-red-500" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">Total P&L</span>
            </div>
            <p className={`text-3xl font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
              ${Math.abs(totalPnL).toFixed(2)}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUpIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">ROI</span>
            </div>
            <p className={`text-3xl font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
              {pnlPercentage}%
            </p>
          </Card>
        </div>

        <Card>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Token</th>
                  <th className="text-left p-4 font-semibold">Headline</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                  <th className="text-right p-4 font-semibold">Avg Price</th>
                  <th className="text-right p-4 font-semibold">Current Price</th>
                  <th className="text-right p-4 font-semibold">P&L</th>
                </tr>
              </thead>
              <tbody>
                {portfolioHoldings.map((holding) => (
                  <tr key={holding.symbol} className="border-t hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <Badge variant="outline" className="font-mono">
                        {holding.symbol}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{holding.headline}</p>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium">{holding.amount}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-muted-foreground">${holding.avgPrice}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold">${holding.currentPrice}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-bold ${holding.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {holding.pnl >= 0 ? "+" : ""}
                        {holding.pnl.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
