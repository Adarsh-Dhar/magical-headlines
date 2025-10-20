# Magical Headlines — Trade the News

Where breaking news becomes tradable assets. Post a story, mint a token, and let the market speculate on attention in real time.

This repository contains:
- A Next.js 15 app (React 19, Tailwind v4) for the UI and API routes
- An Anchor-based Solana program (`news_platform`) consumed from the client
- An Oracle Service that watches on-chain `newsAccount`s and generates AI summaries
- Arweave upload integration powered by `@ardrive/turbo-sdk`
- Real-time user notifications via Server-Sent Events (SSE)

The project maps cleanly to the "Trading News App" RFP for MagicBlock's Cypherpunk Hackathon. See the MagicBlock section for Ephemeral Rollups (ERs) integration guidance.

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   cd oracle-service && pnpm install && cd ..
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Set up the database:**
   ```bash
   pnpm prisma migrate dev
   pnpm prisma generate
   ```

4. **Start both services (recommended):**
   ```bash
   ./start-dev.sh
   ```
   
   Or start individually:
   ```bash
   # Terminal 1: Next.js app
   pnpm dev
   
   # Terminal 2: Oracle service
   cd oracle-service
   pnpm build && pnpm start
   ```

5. **Visit the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Debug Volume Data

Check recent volume data for a token:
```bash
curl "http://localhost:3000/api/debug/volume?tokenId=YOUR_TOKEN_ID&limit=5"
```

## Tech Stack
- Next.js 15 (app router) + React 19 + Tailwind v4
- Prisma + SQLite (local development) in `prisma/dev.db`
- Solana: `@coral-xyz/anchor`, `@solana/web3.js`, SPL Token
- Arweave uploads with `@ardrive/turbo-sdk`
- Wallets: `@solana/wallet-adapter-*`
- Notifications: in-memory bus + SSE stream


## Monorepo Structure
- `app/` — Next.js app (routes, API, pages, layout, styles)
- `components/` — UI components (including `create-story-dialog`)
- `lib/` — client hooks (`use-contract`), prisma client, utils, notification bus
- `contract/` — Anchor program (IDL consumed at runtime)
- `oracle-service/` — off-chain listener, AI summary pipeline
- `prisma/` — schema, migrations, local SQLite db
- `scripts/` — helper scripts (initialize oracle, whitelist, etc.)


## Environment Variables

Create `./.env.local` at repo root for the Next.js app:

```bash
# Required: the deployed Anchor program id for news_platform
NEXT_PUBLIC_PROGRAM_ID=7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf

# Optional: Arweave JWK if you don't use the local key file
ARWEAVE_JWK="{\"kty\":\"...\"}"

# Optional: Next settings
NODE_ENV=development
```

Create `./oracle-service/.env` for the Oracle:

```bash
PROGRAM_ID=7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf
SOLANA_RPC_URL=https://api.devnet.solana.com

# Provide either a keypair path OR an inline secret key array
ORACLE_KEYPAIR_PATH=/absolute/path/to/oracle-keypair.json
# OR
ORACLE_SECRET_KEY=[1,2,3,...]

# Used for AI summaries
GEMINI_API_KEY=your_gemini_api_key
```

Arweave signing key: by default the API tries to read a local file at the repo root:
`arweave-key-xKXw5T4YdKwRCatwj-TDr0Imv1FP-Ogx3F2wD07mcQc.json`. If missing, it falls back to `ARWEAVE_JWK`.


## Install & Run

Prerequisites: Node 20+, pnpm 9+, Solana CLI (for on-chain ops), Anchor toolchain if building the program.

1) Install deps (root app)
```bash
pnpm install
```

2) Generate Prisma client and run migrations
```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

3) Start the web app
```bash
pnpm dev
# http://localhost:3000
```

4) Start the Oracle Service (separate terminal)
```bash
cd oracle-service
pnpm install
pnpm start
```


## Core Flows

### Post a Story (Client → Arweave → Solana → DB)
Component: `components/create-story-dialog.tsx`
1. User inputs headline, content, original URL and optional tags
2. Client uploads structured JSON to Arweave via API: `POST /api/arweave/upload`
3. On success, client calls `useContract().publishNews` with the Arweave link and a unique nonce
4. After on-chain success, client persists the story to DB via `POST /api/story`
5. Notification fan-out to subscribers and SSE stream

Important validations handled client-side and server-side (Zod) to avoid malformed data.

### Arweave Uploads
API: `app/api/arweave/upload/route.ts`
- Uses `@ardrive/turbo-sdk` with `ArweaveSigner`
- Reads local JWK file at repo root; falls back to `ARWEAVE_JWK`
- Enforces a 20s timeout to prevent hanging uploads

Request format from client hook `lib/functions/publish-news.ts`:
```ts
await fetch('/api/arweave/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: JSON.stringify(content), tags, walletAddress })
})
```

### On-chain Contract Access
Hook: `lib/use-contract.ts`
- Requires `NEXT_PUBLIC_PROGRAM_ID`
- Wraps Anchor RPC calls (e.g., `publishNews`, `buy`, `sell`, `delegate`, `commit`, `undelegate`)
- Derives PDAs for news, mint, market, metadata, oracle
- Adds verification steps after transactions where possible

Program IDL is loaded from `contract/target/idl/news_platform.json`.

### Database Models (Prisma)
File: `prisma/schema.prisma`
- `User` keyed by `walletAddress`
- `Story` with `arweaveUrl`, `arweaveId`, `onchainSignature`, `authorAddress`, optional `nonce`
- `Token` for tradable assets per Story
- `Holding`, `Trade`, `Like`, `Comment`
- `Subscription`, `Notification` for social and real-time features

SQLite is used for local development; consider Postgres for production.

### Real-time Notifications
- In-memory event bus: `lib/notification-bus.ts` (fan-out from create story)
- HTTP API: `GET /api/notifications?wallet=...`, `PATCH /api/notifications`
- SSE stream: `GET /api/notifications/stream?wallet=...`
  - Client demo usage in `components/navigation.tsx` with `use-notifications` hook


## API Endpoints (Selected)
- `POST /api/arweave/upload` — upload content to Arweave (expects JSON payload)
- `POST /api/story` — persist story after successful on-chain publish
- `GET /api/story` — list stories (pagination, search, tag, sorting)
- `GET /api/story?id=...` — fetch single story with relations
- `GET /api/leaderboard` — computed trader stats from trades/holdings/stories
- `GET /api/notifications` — recent notifications + unread count
- `PATCH /api/notifications` — mark notifications read/unread
- `GET /api/notifications/stream` — SSE stream per wallet


## Oracle Service
File: `oracle-service/src/listener.ts`
- Connects to Solana and processes existing `newsAccount`s missing summaries
- Subscribes to `onProgramAccountChange` for new accounts
- Delegates to `handleNewArticle` for AI summary and follow-up

Run it with the envs above:
```bash
cd oracle-service
pnpm start
```


## MagicBlock: Ephemeral Rollups (ERs) Integration
Real-time isn’t just a feature—it’s the edge. This app already exposes primitives that map well to ERs:

- Delegate rollup authority on a `market` PDA (`delegate`/`undelegate` in `use-contract.ts`)
- Periodically commit state (`commit`) based on off-chain activity (e.g., matching engine, pricing)

Suggested integration plan:
1. Create an ER for each active `market` (news token) and elect a rollup authority
2. Route high-frequency buy/sell intents to the ER for soft-confirmation in milliseconds
3. Emit provisional balances and price ticks to the client over a dedicated ER WebSocket channel
4. Batch settle finalized state to L1 (Solana) periodically via `commit` (and/or `publishNews` for mints)
5. Restrict settlement authority using `delegate` to the ER operator

Example pseudocode (client-side intent flow):
```ts
// 1) Send intent to ER service (low latency)
await fetch('https://your-er.example/intent', {
  method: 'POST',
  body: JSON.stringify({ market, side: 'BUY', qty: 10, wallet })
})

// 2) Subscribe to ER price/position stream
const ws = new WebSocket('wss://your-er.example/stream?market=...&wallet=...')
ws.onmessage = (msg) => {
  const update = JSON.parse(msg.data)
  // update provisional balance/price in UI instantly
}

// 3) Periodic settlement to L1 (server-side)
// ER aggregates intents and calls `commit` with newSupply/newReserves when ready
```

Deliverables for the MagicBlock side track:
- ER deployment scripts and address registry per `market`
- Minimal ER gateway (intent ingestion + stream) coexisting with our Next.js API
- Hooks in UI to display provisional fills and then confirmed on-chain state

Privacy variant: use Private ERs to match intents and only disclose finalized state to L1.


## Styling & Aesthetics
- Tailwind-first components and layouts
- Keep consistent design language from `components/ui/*`
- Pages to explore: `app/page.tsx` (Feed), `app/portfolio/page.tsx`, `app/leaderboard/page.tsx`


## Troubleshooting
- Missing `NEXT_PUBLIC_PROGRAM_ID` → set it in `.env.local`
- Arweave upload fails → ensure key file exists or set `ARWEAVE_JWK`
- Wallet errors (Blockhash not found) → retry is built-in for buy/sell; check RPC
- Insufficient SOL → fund the wallet on Devnet for fees
- Rate limiting on RPC → the code includes small backoffs; consider a dedicated RPC


## Scripts & Utilities
- `scripts/initialize-oracle.ts` — set up oracle accounts/authority
- `scripts/whitelist-oracle.ts` — whitelist oracle authority
- `scripts/check-news-accounts.ts` — inspect on-chain state


## Development Notes
- Local DB is SQLite for convenience; swap to Postgres in production
- The in-memory notification bus is single-instance; use Redis for multi-instance deploys
- The Anchor program is not built in this repo by default; IDL is consumed at runtime


## License
MIT (c) 2025 Magical Headlines contributors
