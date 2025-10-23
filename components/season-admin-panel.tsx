"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrophyIcon, 
  ClockIcon, 
  UsersIcon, 
  Loader2, 
  CheckCircleIcon, 
  AlertCircleIcon,
  CrownIcon
} from "lucide-react"

interface Season {
  seasonId: number
  startTimestamp: string
  endTimestamp: string
  isActive: boolean
  totalParticipants: number
}

interface SeasonAdminPanelProps {
  currentSeason: Season | null
  isAdmin: boolean
  onSeasonEnd: () => Promise<void>
  onRefresh: () => void
  onAwardTrophy: (userAddress: string) => Promise<void>
  onResetSeasonPnl: (userAddress: string) => Promise<void>
}

export function SeasonAdminPanel({
  currentSeason,
  isAdmin,
  onSeasonEnd,
  onRefresh,
  onAwardTrophy,
  onResetSeasonPnl
}: SeasonAdminPanelProps) {
  const [manualTrophyAddress, setManualTrophyAddress] = useState("")
  const [resetPnlAddress, setResetPnlAddress] = useState("")
  const [isEndingSeason, setIsEndingSeason] = useState(false)
  const [isAwardingTrophy, setIsAwardingTrophy] = useState(false)
  const [isResettingPnl, setIsResettingPnl] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  if (!isAdmin) return null

  const formatTimeRemaining = (endTimestamp: string) => {
    const now = new Date().getTime()
    const endTime = new Date(endTimestamp).getTime()
    const diff = endTime - now

    if (diff <= 0) return "00:00:00"

    const h = Math.floor(diff / (1000 * 60 * 60))
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const s = Math.floor((diff % (1000 * 60)) / 1000)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleEndSeason = async () => {
    try {
      setIsEndingSeason(true)
      setMessage(null)
      await onSeasonEnd()
      setMessage({ type: 'success', text: 'Season ended successfully! Trophies awarded to top 10 players.' })
      onRefresh()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Failed to end season: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsEndingSeason(false)
    }
  }

  const handleAwardTrophy = async () => {
    if (!manualTrophyAddress.trim()) {
      setMessage({ type: 'error', text: 'Please enter a wallet address' })
      return
    }

    try {
      setIsAwardingTrophy(true)
      setMessage(null)
      await onAwardTrophy(manualTrophyAddress.trim())
      setMessage({ type: 'success', text: `Trophy awarded to ${manualTrophyAddress.slice(0, 8)}...` })
      setManualTrophyAddress("")
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Failed to award trophy: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsAwardingTrophy(false)
    }
  }

  const handleResetPnl = async () => {
    if (!resetPnlAddress.trim()) {
      setMessage({ type: 'error', text: 'Please enter a wallet address' })
      return
    }

    try {
      setIsResettingPnl(true)
      setMessage(null)
      await onResetSeasonPnl(resetPnlAddress.trim())
      setMessage({ type: 'success', text: `Season PnL reset for ${resetPnlAddress.slice(0, 8)}...` })
      setResetPnlAddress("")
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Failed to reset PnL: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsResettingPnl(false)
    }
  }

  return (
    <Card className="p-6 mb-6 border-amber-200 bg-amber-50/50">
      <div className="flex items-center gap-2 mb-4">
        <CrownIcon className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-amber-800">Season Admin Panel</h3>
        <Badge variant="outline" className="border-amber-300 text-amber-700">
          Admin
        </Badge>
      </div>

      {message && (
        <Alert className={`mb-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircleIcon className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {currentSeason && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium">Season {currentSeason.seasonId}</span>
          </div>
          
          {currentSeason.isActive && (
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-mono font-bold">
                {formatTimeRemaining(currentSeason.endTimestamp)}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-amber-600" />
            <span className="text-sm">{currentSeason.totalParticipants} participants</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* End Season Section */}
        {currentSeason?.isActive && (
          <div className="p-4 border border-amber-200 rounded-lg bg-white">
            <h4 className="font-medium mb-3 text-amber-800">End Current Season</h4>
            <p className="text-sm text-amber-700 mb-3">
              This will award trophies to the top 10 players and start a new season.
            </p>
            <Button 
              onClick={handleEndSeason}
              disabled={isEndingSeason}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isEndingSeason ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ending Season...
                </>
              ) : (
                <>
                  <TrophyIcon className="w-4 h-4 mr-2" />
                  End Season & Award Trophies
                </>
              )}
            </Button>
          </div>
        )}

        {/* Manual Trophy Award */}
        <div className="p-4 border border-amber-200 rounded-lg bg-white">
          <h4 className="font-medium mb-3 text-amber-800">Manual Trophy Award</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Enter wallet address..."
              value={manualTrophyAddress}
              onChange={(e) => setManualTrophyAddress(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleAwardTrophy}
              disabled={isAwardingTrophy || !manualTrophyAddress.trim()}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {isAwardingTrophy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TrophyIcon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Reset Season PnL */}
        <div className="p-4 border border-amber-200 rounded-lg bg-white">
          <h4 className="font-medium mb-3 text-amber-800">Reset Season PnL</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Enter wallet address..."
              value={resetPnlAddress}
              onChange={(e) => setResetPnlAddress(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleResetPnl}
              disabled={isResettingPnl || !resetPnlAddress.trim()}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {isResettingPnl ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reset"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
