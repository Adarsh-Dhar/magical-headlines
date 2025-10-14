# Oracle Service

This service monitors the news platform blockchain for new articles and automatically generates AI summaries.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file with:
   ```env
   SOLANA_RPC_URL=https://api.devnet.solana.com
   PROGRAM_ID=7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf
   ORACLE_KEYPAIR_PATH=../oracle-keypair.json
   GEMINI_API_KEY=your_gemini_api_key_here
   ARWEAVE_UPLOAD_URL=http://localhost:3000
   ```

3. **Test the setup:**
   ```bash
   npm run test-oracle
   ```

4. **Start the oracle:**
   ```bash
   npm start
   ```

## How to Test

1. **Start the oracle service:**
   ```bash
   cd oracle-service
   npm start
   ```

2. **In another terminal, publish a news article:**
   ```typescript
   // Use your frontend or test script to call publish_news()
   await program.methods.publishNews(
     "Test Article",
     "https://arweave.net/test-content",
     new BN(1000),
     new BN(1)
   ).rpc();
   ```

3. **Watch the oracle logs:**
   You should see detailed logs showing:
   - New account detection
   - Article processing
   - AI summary generation
   - On-chain updates

## Expected Logs

When working correctly, you should see:
```
🚀 ========================================
🔍 Starting oracle listener...
📋 Program ID: 7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf
🌐 RPC: https://api.devnet.solana.com
🚀 ========================================
✅ Connected to Solana network. Latest slot: 123456789
👂 Setting up account change listener...
✅ Oracle listener started successfully
🔄 Listening for new news accounts...
💡 Try publishing a news article to see the oracle in action!

🎉 ========================================
📰 NEW ACCOUNT DETECTED!
🔑 Account ID: [NewsAccount PublicKey]
📊 Slot: 123456790
⏰ Time: 2024-01-15T10:30:00.000Z
🎉 ========================================

🔍 ========================================
📝 Starting article processing...
🔑 Account: [NewsAccount PublicKey]
🔍 ========================================
📖 Decoding account data...
📰 Article: "Test Article"
🔗 Arweave Link: https://arweave.net/test-content
📅 Published: 2024-01-15T10:30:00.000Z
🔄 Processing new article without summary...
🌐 Fetching article content from Arweave...
✅ Fetched article content (1234 characters)
🤖 Generating AI summary with Gemini...
✅ Generated summary (234 characters):
📄 "This is a test article about..."
📤 Uploading summary to Arweave...
✅ Summary uploaded to: https://arweave.net/summary-123
⛓️  ========================================
🔗 Updating summary on-chain...
📰 News Account: [NewsAccount PublicKey]
🔗 Summary Link: https://arweave.net/summary-123
⛓️  ========================================
🔑 Oracle Authority: [Oracle PublicKey]
🔑 Whitelist PDA: [Whitelist PDA]
📝 Building transaction...
✅ ========================================
✅ Successfully updated summary on-chain!
🔗 Transaction: [Transaction Signature]
🌐 Explorer: https://explorer.solana.com/tx/[Transaction Signature]
✅ ========================================
🎉 ========================================
✅ Article processing completed successfully!
🔗 Summary link: https://arweave.net/summary-123
🎉 ========================================
```

## Troubleshooting

- **No logs when publishing:** Make sure the oracle service is running and connected to the same network
- **Connection errors:** Check your RPC URL and network connectivity
- **AI errors:** Verify your GEMINI_API_KEY is set correctly
- **Permission errors:** Ensure the oracle authority is whitelisted in the contract
