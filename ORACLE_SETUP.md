# Oracle Setup and Testing Guide

## Overview
The oracle service now automatically generates AI summaries for news stories and updates them on-chain. The frontend displays these summaries when available.

## Setup

### 1. Environment Variables

**Oracle Service:**
```bash
export SOLANA_RPC_URL="https://api.devnet.solana.com"
export PROGRAM_ID="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
export GEMINI_API_KEY="your_gemini_api_key_here"
export ORACLE_KEYPAIR_PATH="/Users/adarsh/Documents/trade-the-news/oracle-keypair.json"
export ARWEAVE_UPLOAD_URL="http://localhost:3000"
```

**Frontend:**
```bash
export NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
export NEXT_PUBLIC_PROGRAM_ID="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"
```

### 2. Get Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Set it as `GEMINI_API_KEY`

### 3. Start Services

**Terminal 1 - Frontend:**
```bash
cd /Users/adarsh/Documents/trade-the-news
npm run dev
```

**Terminal 2 - Oracle:**
```bash
cd /Users/adarsh/Documents/trade-the-news/oracle-service
pnpm install
pnpm run build
pnpm start
```

## Testing the Flow

### 1. Create a Story
1. Go to http://localhost:3000
2. Click "Create Story" or similar
3. Fill in headline and content
4. Submit the story
5. **Expected:** Story is created with only content uploaded to Arweave, no summary yet

### 2. Oracle Processing
1. Check oracle terminal logs
2. **Expected:** Oracle detects new account, generates summary, uploads to Arweave, updates on-chain
3. Look for logs like:
   ```
   📰 New account detected: [address]
   🔄 Processing new article without summary...
   ✅ Generated summary and uploaded to: [arweave_url]
   ```

### 3. View Summary
1. Go to the story detail page
2. **Expected:** "Read AI Summary" button appears
3. Click the button to open the AI-generated summary

## Troubleshooting

### Oracle Not Processing
- Check environment variables are set
- Verify oracle keypair is whitelisted
- Check RPC connection
- Look for error logs

### Summary Not Appearing
- Check if oracle processed the story
- Verify on-chain `summary_link` field is updated
- Check frontend API calls to `/api/news-account`

### Gemini API Issues
- Verify API key is correct
- Check rate limits
- Ensure content is not too long

## Architecture

```
Frontend → Contract (publish_news) → Oracle (listens) → Gemini → Arweave → Contract (update_summary_link) → Frontend (displays)
```

1. **Frontend** creates story, uploads content to Arweave
2. **Contract** stores story with empty `summary_link`
3. **Oracle** detects new account, generates summary via Gemini
4. **Oracle** uploads summary to Arweave
5. **Oracle** updates `summary_link` on-chain
6. **Frontend** reads and displays summary link

## Files Modified

- `oracle-service/src/listener.ts` - Main oracle listener
- `oracle-service/src/article.ts` - Summary generation logic
- `oracle-service/src/config.ts` - Shared configuration
- `lib/fetch-news-account.ts` - Frontend on-chain data fetcher
- `components/news-card.tsx` - Display summary links
- `app/marketplace/[id]/page.tsx` - Story detail page
- `app/api/news-account/route.ts` - API endpoint for on-chain data
