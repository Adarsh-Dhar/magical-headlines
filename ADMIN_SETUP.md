# Admin Setup Guide

This guide explains how to set up the admin functions for season management.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Oracle Admin Configuration
# Public key of the oracle admin wallet (for frontend admin checks)
NEXT_PUBLIC_ORACLE_ADMIN_ADDRESS=your_oracle_admin_public_key_here

# Private key of the oracle admin wallet (for server-side admin operations)
# This should be base58 encoded private key
ORACLE_ADMIN_PRIVATE_KEY=your_oracle_admin_private_key_here
```

## How to Get Admin Keypair

1. **Generate a new keypair** (recommended for production):
   ```bash
   solana-keygen new --outfile admin-keypair.json
   ```

2. **Extract the public key**:
   ```bash
   solana-keygen pubkey admin-keypair.json
   ```

3. **Extract the private key** (base58 encoded):
   ```bash
   cat admin-keypair.json | jq -r '.[:64]' | base58
   ```

4. **Set the environment variables**:
   - `NEXT_PUBLIC_ORACLE_ADMIN_ADDRESS`: Use the public key from step 2
   - `ORACLE_ADMIN_PRIVATE_KEY`: Use the base58 encoded private key from step 3

## Admin Functions

Once configured, the admin can:

1. **View Admin Panel**: Only visible when connected with the admin wallet
2. **End Season**: Awards trophies to top 10 players and starts new season
3. **Manual Trophy Award**: Award trophies to specific users
4. **Reset Season PnL**: Reset season PnL for specific users

## Security Notes

- Keep the `ORACLE_ADMIN_PRIVATE_KEY` secure and never commit it to version control
- The admin keypair should have sufficient SOL for transaction fees
- Consider using a hardware wallet for production environments
- The admin functions are protected by wallet signature verification

## Testing

1. Connect with the admin wallet to the leaderboard page
2. You should see the "Season Admin Panel" with admin controls
3. Test the manual trophy award and PnL reset functions
4. Test the automatic season end/start flow

## Troubleshooting

- If admin panel doesn't appear, check that `NEXT_PUBLIC_ORACLE_ADMIN_ADDRESS` matches your connected wallet
- If on-chain operations fail, check that `ORACLE_ADMIN_PRIVATE_KEY` is correctly formatted
- Ensure the admin wallet has sufficient SOL for transaction fees
