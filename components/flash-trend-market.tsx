"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

export function FlashTrendMarket({ market }: { market: any }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(market.endTimestamp).getTime() - Date.now());
      setTimeLeft(Math.floor(remaining / 1000));
    }, 100);
    
    return () => clearInterval(interval);
  }, [market.endTimestamp]);
  
  const placeTrade = async (direction: 'up' | 'down') => {
    // Implementation for placing trade
  };
  
  const upPercentage = market.totalUpAmount + market.totalDownAmount > 0
    ? (market.totalUpAmount / (market.totalUpAmount + market.totalDownAmount)) * 100
    : 50;
  
  return (
    <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
          ⚡ FLASH MARKET
        </Badge>
        <div className="flex items-center gap-2 text-lg font-mono">
          <Clock className="w-4 h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-1">Initial Velocity</div>
        <div className="text-2xl font-bold">{market.initialVelocity.toFixed(2)} pts/s</div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          onClick={() => placeTrade('up')}
          className="h-20 bg-green-600 hover:bg-green-700"
        >
          <div className="flex flex-col items-center">
            <TrendingUp className="w-6 h-6 mb-1" />
            <span>Velocity UP</span>
            <span className="text-xs">{upPercentage.toFixed(0)}%</span>
          </div>
        </Button>
        
        <Button
          onClick={() => placeTrade('down')}
          className="h-20 bg-red-600 hover:bg-red-700"
        >
          <div className="flex flex-col items-center">
            <TrendingDown className="w-6 h-6 mb-1" />
            <span>Velocity DOWN</span>
            <span className="text-xs">{(100 - upPercentage).toFixed(0)}%</span>
          </div>
        </Button>
      </div>
      
      <div className="text-xs text-gray-400 text-center">
        {market.participantCount} traders • Pool: {(market.totalUpAmount + market.totalDownAmount).toFixed(2)} SOL
      </div>
    </Card>
  );
}

