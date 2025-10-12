"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NewspaperIcon, TrendingUpIcon, WalletIcon, TrophyIcon, BarChart3Icon } from "lucide-react"
import { usePathname } from "next/navigation"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

const navItems = [
  { href: "/", label: "Feed", icon: NewspaperIcon },
  { href: "/marketplace", label: "Marketplace", icon: TrendingUpIcon },
  { href: "/charts", label: "Charts", icon: BarChart3Icon },
  { href: "/portfolio", label: "Portfolio", icon: WalletIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
]

export function Navigation() {
  const pathname = usePathname()

  // Render wallet button only on client after mount to prevent hydration mismatch
  const [mounted, setMounted] = (require('react') as typeof import('react')).useState(false)
  ;(require('react') as typeof import('react')).useEffect(() => setMounted(true), [])

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <NewspaperIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Trade the News</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant={isActive ? "secondary" : "ghost"} className="gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>

          {mounted ? <WalletMultiButton /> : null}
        </div>
      </div>
    </nav>
  )
}
