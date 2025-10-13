import * as fs from "fs";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

function getEnv(name: string, fallback?: string): string {
    const val = process.env[name];
    if (val && val.length > 0) return val;
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env: ${name}`);
}

export function getProgramId(): PublicKey {
    const programIdStr = getEnv("PROGRAM_ID", "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf");
    return new PublicKey(programIdStr);
}

export function getRpcUrl(): string {
    return getEnv("SOLANA_RPC_URL", "https://api.devnet.solana.com");
}

export function getConnection(): Connection {
    return new Connection(getRpcUrl(), "confirmed");
}

function tryLoadKeypairFromPath(filePath?: string): Keypair | undefined {
    if (!filePath) return undefined;
    try {
        const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        const file = fs.readFileSync(resolved, "utf8");
        const json = JSON.parse(file);
        if (Array.isArray(json)) {
            return Keypair.fromSecretKey(Uint8Array.from(json));
        }
        if (json.secretKey && Array.isArray(json.secretKey)) {
            return Keypair.fromSecretKey(Uint8Array.from(json.secretKey));
        }
    } catch (_) {
        // ignore and fall through
    }
    return undefined;
}

function tryLoadKeypairFromEnv(secret?: string): Keypair | undefined {
    if (!secret) return undefined;
    try {
        // Allow either a JSON array string or a path
        if (secret.trim().startsWith("[")) {
            const arr = JSON.parse(secret);
            return Keypair.fromSecretKey(Uint8Array.from(arr));
        }
        // If it's a path, attempt to load
        return tryLoadKeypairFromPath(secret);
    } catch (_) {
        return undefined;
    }
}

export function getOracleKeypair(): Keypair {
    const filePath = process.env.ORACLE_KEYPAIR_PATH;
    const secret = process.env.ORACLE_SECRET_KEY;
    const loaded = tryLoadKeypairFromPath(filePath) || tryLoadKeypairFromEnv(secret);
    if (loaded) return loaded;
    throw new Error("Oracle keypair not configured. Set ORACLE_KEYPAIR_PATH or ORACLE_SECRET_KEY.");
}

export function getWallet(): anchor.Wallet {
    const kp = getOracleKeypair();
    return new anchor.Wallet(kp);
}


