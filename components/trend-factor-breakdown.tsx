import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUpIcon, TrendingDownIcon, BarChart3Icon, UsersIcon, MessageSquareIcon, ZapIcon } from "lucide-react";

interface TrendFactorBreakdownProps {
  factors: {
    sentiment: number;
    trading_velocity: number;
    volume_spike: number;
    price_momentum: number;
    social_activity: number;
    holder_momentum: number;
    cross_market_correlation: number;
  };
  weights?: {
    sentiment: number;
    tradingVelocity: number;
    volumeSpike: number;
    priceMomentum: number;
    socialActivity: number;
    holderMomentum: number;
    crossMarketCorr: number;
  };
  score: number;
  velocity: number;
  confidence: number;
}

export function TrendFactorBreakdown({ 
  factors, 
  weights, 
  score, 
  velocity, 
  confidence 
}: TrendFactorBreakdownProps) {
  
  const factorData = [
    {
      key: 'sentiment',
      label: 'Sentiment',
      value: factors.sentiment,
      weight: weights?.sentiment || 0.25,
      icon: TrendingUpIcon,
      color: factors.sentiment > 0 ? 'text-green-500' : 'text-red-500',
      description: 'AI-analyzed sentiment from news content'
    },
    {
      key: 'trading_velocity',
      label: 'Trading Velocity',
      value: factors.trading_velocity,
      weight: weights?.tradingVelocity || 0.20,
      icon: ZapIcon,
      color: 'text-blue-500',
      description: 'Trades per minute in the last hour'
    },
    {
      key: 'volume_spike',
      label: 'Volume Spike',
      value: factors.volume_spike,
      weight: weights?.volumeSpike || 0.20,
      icon: BarChart3Icon,
      color: 'text-purple-500',
      description: 'Deviation from average volume'
    },
    {
      key: 'price_momentum',
      label: 'Price Momentum',
      value: factors.price_momentum,
      weight: weights?.priceMomentum || 0.15,
      icon: TrendingUpIcon,
      color: factors.price_momentum > 0 ? 'text-green-500' : 'text-red-500',
      description: 'Rate of price change'
    },
    {
      key: 'social_activity',
      label: 'Social Activity',
      value: factors.social_activity,
      weight: weights?.socialActivity || 0.10,
      icon: MessageSquareIcon,
      color: 'text-orange-500',
      description: 'Comments and likes per hour'
    },
    {
      key: 'holder_momentum',
      label: 'Holder Momentum',
      value: factors.holder_momentum,
      weight: weights?.holderMomentum || 0.05,
      icon: UsersIcon,
      color: 'text-cyan-500',
      description: 'New holders rate'
    },
    {
      key: 'cross_market_correlation',
      label: 'Market Correlation',
      value: factors.cross_market_correlation,
      weight: weights?.crossMarketCorr || 0.05,
      icon: BarChart3Icon,
      color: 'text-indigo-500',
      description: 'Correlation with other trending tokens'
    }
  ];

  const formatValue = (key: string, value: number) => {
    switch (key) {
      case 'sentiment':
        return `${(value * 100).toFixed(1)}%`;
      case 'trading_velocity':
        return `${value.toFixed(2)}/min`;
      case 'volume_spike':
        return `${(value * 100).toFixed(1)}%`;
      case 'price_momentum':
        return `${(value * 100).toFixed(2)}%`;
      case 'social_activity':
        return `${value.toFixed(0)}/hr`;
      case 'holder_momentum':
        return `${value.toFixed(1)}`;
      case 'cross_market_correlation':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return value.toFixed(2);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getVelocityIcon = (velocity: number) => {
    return velocity > 0 ? TrendingUpIcon : TrendingDownIcon;
  };

  const VelocityIcon = getVelocityIcon(velocity);

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Trend Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Multi-factor adaptive trend index powered by AI
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <VelocityIcon className={`w-4 h-4 ${velocity > 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={velocity > 0 ? 'text-green-500' : 'text-red-500'}>
              {velocity > 0 ? '+' : ''}{velocity.toFixed(2)}/min
            </span>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Confidence</span>
          <span>{Math.round(confidence * 100)}%</span>
        </div>
        <Progress value={confidence * 100} className="h-2" />
      </div>

      {/* Factor Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium">Factor Breakdown</h4>
        <div className="grid gap-3">
          {factorData.map((factor) => {
            const Icon = factor.icon;
            const contribution = factor.value * factor.weight * 100;
            
            return (
              <div key={factor.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${factor.color}`} />
                  <div>
                    <div className="font-medium text-sm">{factor.label}</div>
                    <div className="text-xs text-muted-foreground">{factor.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatValue(factor.key, factor.value)}</div>
                  <div className="text-xs text-muted-foreground">
                    Weight: {(factor.weight * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Contribution: {contribution.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Explanation */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          AI Analysis
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          This trend score is calculated using AI-determined optimal weights for each factor, 
          adapting to current market conditions. The algorithm analyzes sentiment, trading patterns, 
          social activity, and cross-market correlations to provide a comprehensive trend assessment.
        </p>
      </div>

      {/* Weight Legend */}
      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Note:</strong> Factor weights are dynamically adjusted by AI based on market conditions, 
          time of day, and volatility levels to provide the most accurate trend prediction.
        </p>
      </div>
    </Card>
  );
}
