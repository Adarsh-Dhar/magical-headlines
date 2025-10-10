// This script demonstrates how to generate a new Arweave wallet/keyfile using Node.js.
// You'll need to have the 'arweave' package installed: npm install arweave

// Import the filesystem module to save the keyfile and the Arweave library.
import Arweave from 'arweave';
import fs from 'fs/promises';

// --- Configuration ---
// It's good practice to initialize Arweave. You can point to a specific gateway
// or use the default settings.
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

console.log("Generating a new Arweave wallet...");

async function generateNewWallet() {
    try {
        // 1. Generate the wallet key.
        // This creates a JSON Web Key (JWK), which is the standard format for
        // representing cryptographic keys in JSON. This is your private key.
        const key = await arweave.wallets.generate();
        console.log("Wallet JWK generated successfully.");

        // 2. Get the public wallet address from the key.
        // You can share this address publicly. It's used to identify your wallet
        // and receive tokens, but it cannot be used to spend funds.
        const address = await arweave.wallets.jwkToAddress(key);
        console.log(`Your new public Arweave address is: ${address}`);

        // 3. Save the keyfile to disk.
        // **SECURITY WARNING:** This file is your wallet's private key.
        // Anyone with access to this file can control your wallet and its funds.
        // NEVER expose it publicly or commit it to a git repository.
        // Store it securely, for example, in a secret manager or an encrypted file.
        const keyFileName = `arweave-key-${address}.json`;
        await fs.writeFile(keyFileName, JSON.stringify(key, null, 2));

        console.log(`\n✅ Success! Your new keyfile has been saved as "${keyFileName}"`);
        console.log("Keep this file safe and secret!");

    } catch (error) {
        console.error("An error occurred during wallet generation:", error);
    }
}

// Run the wallet generation function.
generateNewWallet();
