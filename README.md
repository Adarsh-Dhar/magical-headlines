# Magical Headlines — Trade the News

Where breaking news becomes tradable assets. Post a story, mint a token, and let the market speculate on attention in real time.

![Magical Headlines](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Solana](https://img.shields.io/badge/Solana-Anchor-purple?style=for-the-badge&logo=solana)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-cyan?style=for-the-badge&logo=tailwindcss)

## 🚀 Overview

Magical Headlines is a revolutionary news trading platform that transforms breaking news into tradable tokens. Users can publish news stories, create tradable tokens, and participate in a dynamic marketplace where attention and speculation drive value.

### Key Features

- **📰 News Publishing**: Create and publish news stories with Arweave integration
- **💰 Token Trading**: Buy/sell news tokens using bonding curve mechanics
- **📊 Portfolio Management**: Track holdings, P&L, and trading performance
- **🏆 Leaderboards**: Compete in seasonal trading competitions
- **🔔 Real-time Notifications**: Stay updated with SSE-powered notifications
- **🤖 AI Summaries**: Automated news summarization via Oracle service
- **⚡ Ephemeral Rollups**: High-speed trading with MagicBlock integration
- **📈 Advanced Charts**: Candlestick charts, volume analysis, and market stats

## 🏗️ Architecture

This repository contains:
- **Next.js 15 App**: React 19 frontend with Tailwind v4 styling
- **Solana Program**: Anchor-based smart contract for news trading
- **Oracle Service**: AI-powered news summarization and monitoring
- **Database**: Prisma with SQLite (dev) / PostgreSQL (prod)
- **Real-time Features**: Server-Sent Events for live updates

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 19** with modern hooks
- **Tailwind CSS v4** for styling
- **Radix UI** components
- **Lightweight Charts** for trading charts
- **Solana Wallet Adapter** for wallet integration

### Backend
- **Prisma** ORM with SQLite/PostgreSQL
- **Next.js API Routes** for backend logic
- **Server-Sent Events** for real-time updates
- **Zod** for data validation

### Blockchain
- **Solana** blockchain
- **Anchor Framework** for smart contracts
- **SPL Token** standard
- **Ephemeral Rollups SDK** for high-speed trading

### External Services
- **Arweave** for decentralized content storage
- **Google Gemini AI** for news summarization
- **MagicBlock** for ephemeral rollups

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Solana CLI
- Anchor toolchain (for contract development)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd trade-the-news
   pnpm install
   cd oracle-service && pnpm install && cd ..
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Initialize the database:**
   ```bash
   pnpm prisma migrate dev
   pnpm prisma generate
   ```

4. **Start the development servers:**
   ```bash
   # Start both services (recommended)
   ./start-dev.sh
   
   # Or start individually:
   # Terminal 1: Next.js app
   pnpm dev
   
   # Terminal 2: Oracle service
   cd oracle-service
   pnpm build && pnpm start
   ```

5. **Visit the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
trade-the-news/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── arweave/              # Arweave upload endpoints
│   │   ├── blockchain/           # Blockchain utilities
│   │   ├── comments/             # Comment management
│   │   ├── leaderboard/          # Leaderboard calculations
│   │   ├── notifications/        # Real-time notifications
│   │   ├── portfolio/            # Portfolio management
│   │   ├── story/                # Story CRUD operations
│   │   └── trades/               # Trading operations
│   ├── [id]/                     # Dynamic story pages
│   ├── leaderboard/             # Leaderboard page
│   ├── portfolio/                # Portfolio page
│   └── page.tsx                  # Home page
├── components/                    # React components
│   ├── ui/                       # Reusable UI components
│   ├── create-story-dialog.tsx   # Story creation modal
│   ├── news-card.tsx             # News story cards
│   ├── news-feed.tsx             # Main news feed
│   ├── candlestick-chart.tsx     # Trading charts
│   ├── portfolio-pnl-summary.tsx # P&L tracking
│   ├── trade-history.tsx         # Trade history
│   └── user-profile.tsx          # User profiles
├── contract/                     # Solana smart contract
│   ├── programs/contract/        # Anchor program source
│   └── target/idl/               # Generated IDL files
├── oracle-service/               # AI Oracle service
│   ├── src/                      # TypeScript source
│   └── prisma/                   # Oracle database schema
├── lib/                          # Shared utilities
│   ├── hooks/                    # Custom React hooks
│   ├── use-contract.ts           # Solana contract integration
│   ├── notification-bus.ts       # Real-time notifications
│   └── utils.ts                  # Utility functions
├── prisma/                       # Database schema and migrations
└── scripts/                      # Utility scripts
```

## 🔧 Environment Variables

### Main Application (`.env.local`)
```bash
# Required: Solana program ID
NEXT_PUBLIC_PROGRAM_ID=7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf

# Optional: Arweave configuration
ARWEAVE_JWK="{\"kty\":\"...\"}"

# Optional: Environment settings
NODE_ENV=development
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Oracle Service (`oracle-service/.env`)
```bash
# Solana configuration
PROGRAM_ID=7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf
SOLANA_RPC_URL=https://api.devnet.solana.com

# Oracle keypair (choose one method)
ORACLE_KEYPAIR_PATH=/absolute/path/to/oracle-keypair.json
# OR
ORACLE_SECRET_KEY=[1,2,3,...]

# AI service
GEMINI_API_KEY=your_gemini_api_key
```

## 🎯 Core Features

### 📰 News Publishing
- **Story Creation**: Publish news with headlines, content, and metadata
- **Arweave Integration**: Decentralized content storage
- **Tag System**: Categorize stories for better discovery
- **AI Summaries**: Automatic content summarization

### 💰 Token Trading
- **Bonding Curves**: Exponential price curves for token valuation
- **Buy/Sell Operations**: Seamless token trading
- **Market Making**: Automated liquidity provision
- **Fee Structure**: 0.5% trading fees for staking rewards

### 📊 Portfolio Management
- **Holdings Tracking**: Real-time portfolio monitoring
- **P&L Analysis**: Detailed profit/loss calculations
- **Trade History**: Complete transaction records
- **Performance Metrics**: ROI, win rate, and volume tracking

### 🏆 Competitive Features
- **Seasonal Competitions**: Time-limited trading seasons
- **Leaderboards**: Multiple ranking systems (ROI, volume, P&L)
- **Trophy System**: Achievement-based rewards
- **Social Features**: Follow authors, like stories, comments

### ⚡ Advanced Trading
- **Ephemeral Rollups**: High-speed trading with MagicBlock
- **Auto-Delegation**: Automatic rollup delegation for active markets
- **State Commits**: Periodic settlement to main chain
- **Real-time Charts**: Candlestick charts with volume analysis

## 🔌 API Endpoints

### Story Management
- `POST /api/story` - Create new story
- `GET /api/story` - List stories (with pagination, search, filters)
- `GET /api/story?id=...` - Get single story details

### Trading Operations
- `POST /api/trades` - Execute buy/sell transactions
- `GET /api/trades` - Get trade history
- `GET /api/portfolio/pnl` - Calculate portfolio P&L

### Social Features
- `POST /api/likes` - Like/unlike stories
- `GET /api/likes` - Get like counts and status
- `POST /api/comments` - Add comments to stories
- `GET /api/comments` - Get story comments

### Analytics & Leaderboards
- `GET /api/leaderboard` - Get trader rankings
- `GET /api/stats` - Market statistics
- `GET /api/profile` - User profile data

### Real-time Features
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications` - Mark notifications as read
- `GET /api/notifications/stream` - SSE notification stream

### Blockchain Integration
- `POST /api/arweave/upload` - Upload content to Arweave
- `GET /api/blockchain/market` - Get market account data
- `GET /api/debug/volume` - Debug volume data

## 🤖 Oracle Service

The Oracle Service monitors the blockchain for new news accounts and generates AI-powered summaries.

### Features
- **Real-time Monitoring**: Watches for new `newsAccount` creations
- **AI Summarization**: Uses Google Gemini for content analysis
- **Automatic Updates**: Updates story summaries on-chain
- **Error Handling**: Robust error handling and retry logic

### Usage
```bash
cd oracle-service
pnpm install
pnpm build
pnpm start
```

## 🔗 Smart Contract Integration

### Core Functions
- `publish_news()` - Create news token with bonding curve
- `buy()` - Purchase tokens from bonding curve
- `sell()` - Sell tokens back to bonding curve
- `delegate()` - Delegate market to ephemeral rollup
- `commit()` - Commit rollup state to main chain
- `stake_author_tokens()` - Stake tokens for fee rewards
- `claim_staking_fees()` - Claim accumulated trading fees

### Account Structures
- `NewsAccount` - Story metadata and mint reference
- `Market` - Trading state and bonding curve parameters
- `Profile` - User trading statistics and P&L
- `Season` - Competition periods and rankings

## 🎨 UI Components

### Core Components
- **NewsFeed**: Main story browsing interface
- **NewsCard**: Individual story display with trading controls
- **CreateStoryDialog**: Story creation modal
- **CandlestickChart**: Advanced trading charts
- **PortfolioPnLSummary**: Portfolio performance tracking
- **TradeHistory**: Complete transaction history
- **UserProfile**: User statistics and achievements
- **MarketStats**: Market overview and statistics

### Design System
- **Tailwind CSS v4** for styling
- **Radix UI** for accessible components
- **Lucide React** for consistent icons
- **Responsive Design** for all screen sizes
- **Dark Mode** support throughout

## 🚀 Deployment

### Development
```bash
# Start development servers
./start-dev.sh

# Or manually:
pnpm dev                    # Next.js app
cd oracle-service && pnpm start  # Oracle service
```

### Production
```bash
# Build the application
pnpm build

# Start production server
pnpm start

# Deploy Oracle service
cd oracle-service
pnpm build
pm2 start dist/listener.js --name oracle-service
```

### Database Migration
```bash
# Run migrations
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

## 🔧 Development Scripts

### Utility Scripts
- `scripts/initialize-oracle.ts` - Set up oracle accounts
- `scripts/whitelist-oracle.ts` - Whitelist oracle authority
- `scripts/check-news-accounts.ts` - Inspect on-chain state
- `scripts/manage-seasons-cron.ts` - Season management automation

### Database Scripts
- `scripts/init-season-db.ts` - Initialize season data
- `scripts/backfill-minute-volume.ts` - Backfill volume data
- `scripts/verify-real-data.ts` - Verify data integrity

## 🧪 Testing

### Debug Endpoints
```bash
# Check volume data
curl "http://localhost:3000/api/debug/volume?tokenId=YOUR_TOKEN_ID&limit=5"

# Test Oracle service
cd oracle-service
pnpm test-oracle
```

### Contract Testing
```bash
cd contract
anchor test
```

## 🔒 Security Features

- **Input Validation**: Comprehensive Zod schemas
- **Rate Limiting**: API endpoint protection
- **Wallet Verification**: Solana signature validation
- **Arweave Integrity**: Content hash verification
- **Oracle Authorization**: Whitelisted authority system

## 📈 Performance Optimizations

- **Request Caching**: Intelligent API response caching
- **Database Indexing**: Optimized query performance
- **Real-time Updates**: Efficient SSE implementation
- **Chart Rendering**: Optimized chart performance
- **Bundle Optimization**: Next.js automatic optimizations

## 🐛 Troubleshooting

### Common Issues

**Missing Program ID**
```bash
# Set in .env.local
NEXT_PUBLIC_PROGRAM_ID=7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf
```

**Arweave Upload Failures**
```bash
# Ensure key file exists or set ARWEAVE_JWK
ls arweave-key-*.json
```

**Wallet Connection Issues**
- Check Solana RPC endpoint
- Verify wallet adapter configuration
- Ensure sufficient SOL for transaction fees

**Database Connection**
```bash
# Reset database
rm prisma/dev.db
pnpm prisma migrate dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MagicBlock** for Ephemeral Rollups integration
- **Solana** for blockchain infrastructure
- **Arweave** for decentralized storage
- **Google** for AI summarization capabilities
- **Anchor** for Solana development framework

---

**Built with ❤️ for the future of decentralized news trading**