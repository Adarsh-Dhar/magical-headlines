# magical-headlines

## Oracle Service Setup

Set the following environment variables before running `oracle-service`:

- PROGRAM_ID: Solana program ID for `news_platform` (defaults to current value)
- SOLANA_RPC_URL: RPC endpoint (e.g., https://api.devnet.solana.com)
- ORACLE_KEYPAIR_PATH: Absolute path to a JSON keypair file, or
- ORACLE_SECRET_KEY: JSON array string of the secret key (alternative to path)
- GEMINI_API_KEY: API key for Google Gemini used to summarize articles

Run build:

```bash
cd oracle-service
pnpm install
pnpm run build
```

Then start your listener script (example run script not included here).
