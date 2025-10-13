# Price Chart Testing Guide

## Quick Test

1. **Visit the test page**: Navigate to `/test-chart` in your browser
2. **Check the console**: Open browser dev tools to see debug logs
3. **Verify chart rendering**: You should see price charts with mock data

## What You Should See

### ✅ Working Chart
- A line chart showing price over time
- Y-axis range from $0.00 to $0.05
- X-axis showing timestamps
- Interactive tooltips on hover
- Live connection status indicator

### 🔧 Debug Information
In development mode, you'll see a "Debug Info" section showing:
- Data availability status
- Number of price history points
- Current price value
- Live data status
- Loading state
- Error messages

## Troubleshooting

### No Chart Visible
1. Check browser console for errors
2. Verify all required props are passed:
   - `tokenId`
   - `marketAddress`
   - `newsAccountAddress`
   - `mintAddress`

### Chart Shows Mock Data
This is expected behavior when:
- No historical data is available
- Live data fetching fails
- Contract addresses are invalid

### Live Data Not Working
1. Ensure wallet is connected
2. Check contract addresses are valid
3. Verify RPC connection is working
4. Check console for error messages

## Expected Behavior

1. **With Real Data**: Shows historical price data + live updates
2. **With Live Data Only**: Generates price history from current price
3. **With No Data**: Shows mock data chart for testing

## Test URLs

- Main app: `/marketplace/[story-id]`
- Test page: `/test-chart`
- Debug info: Available in development mode

## Chart Features

- **Live Updates**: Every 3-5 seconds from Solana contract
- **Price Range**: Fixed at $0.00 to $0.05
- **Timeframes**: 1H, 24H, 7D, 30D
- **Visual Indicators**: Live status, price changes, volume
- **Responsive**: Adapts to container size
