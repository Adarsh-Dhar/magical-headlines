import { useCallback, useMemo } from 'react'

export type CurveType = 'linear' | 'exponential' | 'logarithmic'

export interface BondingCurveParams {
  currentSupply: number
  amount: number
  curveType: CurveType
}

export interface BondingCurveResult {
  cost: number
  averagePrice: number
  priceRange: {
    startPrice: number
    endPrice: number
  }
}

export function useBondingCurve() {
  const calculateBuyCost = useCallback((params: BondingCurveParams): BondingCurveResult => {
    const { currentSupply, amount, curveType } = params
    
    const basePrice = 1000000 // 0.001 SOL in lamports
    const slope = 100 // Price increase per token
    
    switch (curveType) {
      case 'linear': {
        const startPrice = basePrice + (currentSupply * slope)
        const endPrice = basePrice + ((currentSupply + amount) * slope)
        const averagePrice = (startPrice + endPrice) / 2
        const cost = averagePrice * amount
        
        return {
          cost,
          averagePrice,
          priceRange: {
            startPrice,
            endPrice,
          },
        }
      }
      
      case 'exponential': {
        let totalCost = 0
        let startPrice = 0
        let endPrice = 0
        
        for (let i = 0; i < amount; i++) {
          const supply = currentSupply + i
          const price = basePrice * (10000 + supply) / 10000
          
          if (i === 0) startPrice = price
          if (i === amount - 1) endPrice = price
          
          totalCost += price
        }
        
        const averagePrice = totalCost / amount
        
        return {
          cost: totalCost,
          averagePrice,
          priceRange: {
            startPrice,
            endPrice,
          },
        }
      }
      
      case 'logarithmic': {
        let totalCost = 0
        let startPrice = 0
        let endPrice = 0
        
        for (let i = 0; i < amount; i++) {
          const supply = currentSupply + i + 1
          const price = basePrice + (1000 * Math.log2(supply))
          
          if (i === 0) startPrice = price
          if (i === amount - 1) endPrice = price
          
          totalCost += price
        }
        
        const averagePrice = totalCost / amount
        
        return {
          cost: totalCost,
          averagePrice,
          priceRange: {
            startPrice,
            endPrice,
          },
        }
      }
      
      default:
        const cost = basePrice * amount
        return {
          cost,
          averagePrice: basePrice,
          priceRange: {
            startPrice: basePrice,
            endPrice: basePrice,
          },
        }
    }
  }, [])

  const calculateSellRefund = useCallback((params: BondingCurveParams): BondingCurveResult => {
    const { currentSupply, amount, curveType } = params
    
    // Selling is the reverse of buying, so we calculate the cost of the tokens being sold
    const newSupply = currentSupply - amount
    return calculateBuyCost({
      currentSupply: newSupply,
      amount,
      curveType,
    })
  }, [calculateBuyCost])

  const calculatePriceAtSupply = useCallback((supply: number, curveType: CurveType): number => {
    const basePrice = 1000000 // 0.001 SOL in lamports
    const slope = 100 // Price increase per token
    
    switch (curveType) {
      case 'linear':
        return basePrice + (supply * slope)
      
      case 'exponential':
        return basePrice * (10000 + supply) / 10000
      
      case 'logarithmic':
        return basePrice + (1000 * Math.log2(supply + 1))
      
      default:
        return basePrice
    }
  }, [])

  const calculateTotalValue = useCallback((supply: number, curveType: CurveType): number => {
    const basePrice = 1000000 // 0.001 SOL in lamports
    const slope = 100 // Price increase per token
    
    switch (curveType) {
      case 'linear': {
        // Integral of (basePrice + slope * x) from 0 to supply
        return (basePrice * supply) + (slope * supply * supply) / 2
      }
      
      case 'exponential': {
        // Approximate integral for exponential curve
        let totalValue = 0
        for (let i = 0; i < supply; i++) {
          totalValue += basePrice * (10000 + i) / 10000
        }
        return totalValue
      }
      
      case 'logarithmic': {
        // Approximate integral for logarithmic curve
        let totalValue = 0
        for (let i = 1; i <= supply; i++) {
          totalValue += basePrice + (1000 * Math.log2(i))
        }
        return totalValue
      }
      
      default:
        return basePrice * supply
    }
  }, [])

  const getCurveInfo = useCallback((curveType: CurveType) => {
    switch (curveType) {
      case 'linear':
        return {
          name: 'Linear',
          description: 'Price increases linearly with supply',
          formula: 'Price = Base + (Supply × Slope)',
          characteristics: ['Predictable pricing', 'Constant price increase', 'Good for stable markets'],
        }
      
      case 'exponential':
        return {
          name: 'Exponential',
          description: 'Price increases exponentially with supply',
          formula: 'Price = Base × (1.0001^Supply)',
          characteristics: ['Rapid price increase', 'High volatility', 'Good for speculative markets'],
        }
      
      case 'logarithmic':
        return {
          name: 'Logarithmic',
          description: 'Price increases logarithmically with supply',
          formula: 'Price = Base + (Scale × log2(Supply))',
          characteristics: ['Gradual price increase', 'Lower volatility', 'Good for long-term markets'],
        }
      
      default:
        return {
          name: 'Unknown',
          description: 'Unknown curve type',
          formula: 'N/A',
          characteristics: [],
        }
    }
  }, [])

  return {
    calculateBuyCost,
    calculateSellRefund,
    calculatePriceAtSupply,
    calculateTotalValue,
    getCurveInfo,
  }
}

// Hook to get bonding curve data for a specific market
export function useBondingCurveData(marketData: any) {
  const { calculateBuyCost, calculateSellRefund, calculatePriceAtSupply, calculateTotalValue, getCurveInfo } = useBondingCurve()

  const curveData = useMemo(() => {
    if (!marketData) return null

    const { currentSupply, curveType } = marketData

    return {
      currentPrice: calculatePriceAtSupply(currentSupply, curveType),
      totalValue: calculateTotalValue(currentSupply, curveType),
      curveInfo: getCurveInfo(curveType),
    }
  }, [marketData, calculatePriceAtSupply, calculateTotalValue, getCurveInfo])

  const calculateTradeCost = useCallback((amount: number, isBuy: boolean) => {
    if (!marketData) return null

    const { currentSupply, curveType } = marketData

    if (isBuy) {
      return calculateBuyCost({ currentSupply, amount, curveType })
    } else {
      return calculateSellRefund({ currentSupply, amount, curveType })
    }
  }, [marketData, calculateBuyCost, calculateSellRefund])

  return {
    curveData,
    calculateTradeCost,
  }
}
