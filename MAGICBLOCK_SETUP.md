# MagicBlock AI Oracle Setup Guide

## Overview

This application uses MagicBlock's Ephemeral Rollups (ER) infrastructure for on-chain AI computation of trend scores. The trend scores are calculated in real-time using adaptive AI weighting based on market conditions.

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Required for MagicBlock AI Oracle
MAGICBLOCK_RPC_URL=https://devnet.magicblock.app
MAGICBLOCK_SESSION_KEYPAIR=[your-session-keypair-json-array]

# Required for Oracle Authority
ORACLE_KEYPAIR_PATH=oracle-keypair.json
# OR
ORACLE_SECRET_KEY=[oracle-keypair-json-array]

# Required for Solana Connection
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf

# Required for Gemini AI (fallback)
GEMINI_API_KEY=your-gemini-api-key

# Database
DATABASE_URL="file:./prisma/dev.db"
```

### 2. Getting MagicBlock Credentials

1. **Register with MagicBlock**: Visit https://magicblock.app and create an account
2. **Get RPC URL**: Use the devnet endpoint: `https://devnet.magicblock.app`
3. **Generate Session Keypair**: Use Solana CLI or the MagicBlock dashboard
   ```bash
   solana-keygen new --outfile session-keypair.json
   ```
4. **Export as JSON Array**: The keypair should be in format:
   ```json
   [123, 45, 67, ...]
   ```

### 3. Running the Oracle Service

The oracle service runs automatically to calculate trend scores every 5 minutes.

#### Option A: Run Oracle Service Separately

```bash
# Start the oracle service in a separate terminal
npm run oracle
```

#### Option B: Run with Next.js Development Server

```bash
# Start both Next.js and Oracle Service concurrently
npm run dev:with-oracle
```

## How It Works

### Architecture

1. **Oracle Service** (`oracle-service/src/`):
   - Listens for blockchain events (new stories, trades)
   - Periodically updates active markets every 5 minutes
   - Calls MagicBlock AI Oracle for trend calculation

2. **MagicBlock AI Oracle** (`oracle-service/src/magicblock-ai-oracle.ts`):
   - Executes on-chain AI computation via Ephemeral Rollups
   - Calculates adaptive trend scores based on 7 market factors:
     - Sentiment (-1 to 1)
     - Trading velocity (trades per minute)
     - Volume spike (deviation from average)
     - Price momentum (rate of change)
     - Social activity (interactions per hour)
     - Holder momentum (new holders)
     - Cross-market correlation

3. **On-Chain Computation** (`contract/programs/contract/src/lib.rs`):
   - Executes `compute_ai_trend_index` instruction
   - Performs adaptive weighting based on market volatility
   - High volatility → emphasizes velocity and momentum (35% each)
   - Low volatility → emphasizes sentiment (25%)
   - Result: 0-100 trend score computed on-chain

4. **Database Storage**:
   - Scores stored in `Token.trendIndexScore` field
   - History tracked in `TrendIndexHistory` table
   - Updated via API at `/api/trend-index/update`

### API Endpoint

**POST** `/api/trend-index/update`

Calculates and updates trend scores using MagicBlock AI.

**Request**:
```json
{
  "tokenId": "cmh29uvob0003u6h0lzdzvex9",
  "newsAccountAddress": "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
}
```

**Response**:
```json
{
  "success": true,
  "signature": "transaction-signature",
  "trendScore": 65.5,
  "confidence": 0.8,
  "reasoning": "High trading velocity and positive sentiment indicate strong upward trend",
  "message": "Trend index updated successfully using AI"
}
```

## Error Handling

### Circuit Breaker Pattern

The MagicBlock AI Oracle implements a circuit breaker:
- **Threshold**: 5 consecutive failures
- **Timeout**: 60 seconds before auto-reset
- **Status**: Check via `magicBlockAIOracle.getCircuitBreakerStatus()`

### Graceful Degradation

- If MagicBlock is unavailable, the system logs errors but continues
- API endpoints return 503 with error message
- Database and blockchain operations continue unaffected

## Monitoring

### Check Oracle Service Status

```bash
# Check if oracle service is running
ps aux | grep tsx

# View oracle service logs
# The service logs all operations to console
```

### Database Verification

Query recent trend score updates:
```sql
SELECT 
  t.id,
  t.headline,
  t.trendIndexScore,
  t.lastTrendUpdate
FROM Token t
WHERE t.lastTrendUpdate IS NOT NULL
ORDER BY t.lastTrendUpdate DESC
LIMIT 10;
```

### API Health Check

Check trending scores:
```bash
curl http://localhost:3000/api/v1/trending-ai?limit=5
```

## Troubleshooting

### Issue: "MagicBlock AI Oracle unavailable"

**Cause**: Environment variables not set or incorrect.

**Solution**: 
1. Check `.env` file has `MAGICBLOCK_RPC_URL` and `MAGICBLOCK_SESSION_KEYPAIR`
2. Restart the oracle service
3. Verify session keypair is valid JSON array

### Issue: "Circuit breaker is open"

**Cause**: MagicBlock endpoint is down or rate-limited.

**Solution**:
1. Wait 60 seconds for auto-reset
2. Check MagicBlock status at https://status.magicblock.app
3. Verify RPC URL is correct

### Issue: Oracle service exits on startup

**Cause**: Missing required environment variables.

**Solution**:
1. Check `oracle-service/src/index.ts` initialization
2. Ensure `ORACLE_KEYPAIR_PATH` or `ORACLE_SECRET_KEY` is set
3. Verify Solana RPC URL is accessible

## Performance

- **Update Frequency**: Every 5 minutes (configurable via `TREND_UPDATE_INTERVAL_MINUTES`)
- **Computation Time**: <50ms per market (within ER session)
- **Batch Size**: 5 markets per batch (configurable via `batchSize`)
- **Throughput**: ~60 markets per minute

## Development

### Test Oracle Service Locally

```bash
cd oracle-service
npm run dev-listener
```

### Test Trend Calculation

```bash
cd oracle-service
npx tsx test-ai-trend.ts [tokenId]
```

### Debug MagicBlock Connection

```bash
cd oracle-service
npx tsx -e "import('./src/magicblock-ai-oracle').then(m => m.magicBlockAIOracle.testConnection().then(console.log))"
```

## Production Deployment

1. Set up MagicBlock account and get production credentials
2. Update `MAGICBLOCK_RPC_URL` to production endpoint
3. Deploy oracle service as a separate process (PM2, systemd, etc.)
4. Monitor circuit breaker status and error rates
5. Set up alerts for circuit breaker opens

## Next Steps

- [ ] Get MagicBlock credentials
- [ ] Configure `.env` file
- [ ] Start oracle service: `npm run oracle`
- [ ] Verify trend scores update in database
- [ ] Check trending sidebar shows real scores

