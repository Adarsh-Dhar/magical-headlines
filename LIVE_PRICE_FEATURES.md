# Live Price Features

This document describes the new live price fetching functionality that connects directly to the Solana contract.

## Features

### Real-time Price Updates
- Fetches current price directly from the Solana contract every 3-5 seconds
- Shows live connection status with visual indicators
- Displays current supply and SOL reserves from the contract
- Combines historical data with live updates for comprehensive charts

### Visual Indicators
- **Live Status**: Green WiFi icon when connected, gray WiFi-off icon when offline
- **Live Price**: Animated green dot next to current price when live data is available
- **Contract Info**: Shows supply and reserves from the Solana contract

### Components

#### `useLivePrice` Hook
- Fetches live price data from Solana contract
- Handles connection status and error states
- Configurable refresh intervals
- Automatic retry logic with exponential backoff

#### `usePriceChartData` Hook
- Combines historical data with live updates
- Manages data synchronization
- Handles timeframe changes
- Provides unified data interface

#### Updated `PriceChart` Component
- Accepts contract addresses (market, news account, mint)
- Shows live connection status
- Displays live data indicators
- Configurable live updates and refresh intervals

## Usage

```tsx
<PriceChart 
  tokenId={story.token.id}
  marketAddress={story.token.market}
  newsAccountAddress={story.token.newsAccount}
  mintAddress={story.token.mint}
  height={400}
  showVolume={true}
  liveUpdates={true}
  refreshInterval={3000}
/>
```

## Configuration

- `liveUpdates`: Enable/disable live data fetching (default: true)
- `refreshInterval`: Update frequency in milliseconds (default: 5000ms)
- `timeframe`: Historical data timeframe (1h, 24h, 7d, 30d)

## Contract Integration

The system directly reads from the Solana contract's Market account to get:
- Current supply
- SOL reserves
- Total volume
- Delegation status

Price calculation uses the same exponential curve formula as the contract:
```typescript
const basePrice = 1000000; // 0.001 SOL in lamports
const multiplier = Math.min(10000 + supply, 20000);
const price = Math.floor((basePrice * multiplier) / 10000);
```

## Error Handling

- Automatic retry with exponential backoff
- Graceful fallback to historical data
- Connection status indicators
- User-friendly error messages
