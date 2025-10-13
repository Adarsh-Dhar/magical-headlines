# Oracle Whitelist Script

This script whitelists an oracle authority in the Trade The News contract.

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

2. Generate oracle keypair (if not done already):
```bash
solana-keygen new -o oracle-keypair.json
solana-keygen pubkey oracle-keypair.json  # Copy this public key
```

3. Set environment variables:
```bash
export ORACLE_PUBLIC_KEY="YOUR_ORACLE_PUBLIC_KEY_HERE"
export ADMIN_KEYPAIR_PATH="/path/to/your/admin-keypair.json"
export SOLANA_RPC_URL="https://api.devnet.solana.com"  # optional
export PROGRAM_ID="7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf"  # optional
```

## Usage

```bash
npm run whitelist-oracle
```

## What it does

1. Loads your admin keypair (the wallet that deployed the contract)
2. Calls the `add_authority` instruction with the oracle's public key
3. Whitelists the oracle so it can call `update_summary_link`

## Requirements

- Admin keypair must have SOL for transaction fees
- Admin keypair must be the one that deployed the contract
- Oracle public key must be valid
