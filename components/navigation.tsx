"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { NewspaperIcon, TrendingUpIcon, WalletIcon, TrophyIcon, BarChart3Icon, Bell as BellIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useNotifications } from "@/lib/hooks/use-notifications"

const navItems = [
  { href: "/", label: "Feed", icon: NewspaperIcon },
  // Marketplace removed; keep a placeholder to home for now or remove entirely
  // { href: "/marketplace", label: "Marketplace", icon: TrendingUpIcon },
  { href: "/portfolio", label: "Portfolio", icon: WalletIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
]

function NotificationsList({ onSelect }: { onSelect: () => void }) {
  const { publicKey } = useWallet()
  const walletStr = publicKey?.toBase58()
  const { notifications } = useNotifications(walletStr)

  if (!notifications?.length) {
    return (
      <div className="px-3 py-6 text-sm text-muted-foreground">No notifications yet</div>
    )
  }

  return (
    <ul className="max-h-96 overflow-auto">
      {notifications.map((n) => (
        <li key={(n as any).id || `${n.storyId}-${n.createdAt}`} className="border-b last:border-b-0">
          <Link
            href={`/${n.storyId}`}
            className="block px-3 py-3 hover:bg-muted/60"
            onClick={onSelect}
          >
            <div className="text-sm font-medium">New story</div>
            <div className="text-sm text-muted-foreground line-clamp-2">{n.headline}</div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function Navigation() {
  const pathname = usePathname()
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const walletStr = publicKey?.toBase58()
  const { unread, markAllRead } = useNotifications(walletStr)
  const [open, setOpen] = (require('react') as typeof import('react')).useState(false)

  // Render wallet button only on client after mount to prevent hydration mismatch
  const [mounted, setMounted] = (require('react') as typeof import('react')).useState(false)
  ;(require('react') as typeof import('react')).useEffect(() => setMounted(true), [])

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/magical-headlines-logo-minimal.png"
              alt="Magical Headlines"
              width={100}
              height={100}
              priority
              className="w-8 h-8 rounded-md object-contain"
            />
            <span className="font-bold text-xl">Magical Headlines</span>
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

          {mounted ? (
            <div className="flex items-center gap-2">
              <div className="relative z-50">
                <button
                  className="relative inline-flex items-center justify-center rounded-full h-9 w-9 hover:bg-muted"
                  onClick={() => {
                    if (!connected || !publicKey) {
                      setVisible(true)
                      return
                    }
                    setOpen((v: boolean) => !v)
                  }}
                  aria-label="Notifications"
                >
                  <BellIcon className="h-5 w-5" />
                  {connected && publicKey && unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-medium rounded-full px-1.5 py-0.5">
                      {unread}
                    </span>
                  )}
                </button>

                {open && connected && publicKey ? (
                  <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-popover text-popover-foreground shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
                      <span className="text-sm font-medium">Notifications</span>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => { markAllRead(); }}
                      >
                        Mark all read
                      </button>
                    </div>
                    <NotificationsList onSelect={() => setOpen(false)} />
                  </div>
                ) : null}
              </div>

              <Button
                onClick={() => setVisible(true)}
                className="bg-white text-black hover:bg-white/90 border-0 rounded-md h-9 px-4"
              >
                {connected && publicKey
                  ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
                  : "Connect Wallet"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
