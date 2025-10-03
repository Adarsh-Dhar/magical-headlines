import { Card } from "@/components/ui/card"
import { TrendingUpIcon, UsersIcon, DollarSignIcon, ActivityIcon } from "lucide-react"

const stats = [
  {
    label: "Total Market Cap",
    value: "$12.4M",
    change: "+8.3%",
    icon: DollarSignIcon,
    positive: true,
  },
  {
    label: "Active Stories",
    value: "1,247",
    change: "+156",
    icon: ActivityIcon,
    positive: true,
  },
  {
    label: "Total Traders",
    value: "8,932",
    change: "+423",
    icon: UsersIcon,
    positive: true,
  },
  {
    label: "24h Volume",
    value: "$2.8M",
    change: "+12.7%",
    icon: TrendingUpIcon,
    positive: true,
  },
]

export function MarketStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className={`text-xs font-medium ${stat.positive ? "text-green-500" : "text-red-500"}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        )
      })}
    </div>
  )
}
