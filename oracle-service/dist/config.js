"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProgramId = getProgramId;
exports.getRpcUrl = getRpcUrl;
exports.getConnection = getConnection;
exports.getOracleKeypair = getOracleKeypair;
exports.getWallet = getWallet;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
function getEnv(name, fallback) {
    const val = process.env[name];
    if (val && val.length > 0)
        return val;
    if (fallback !== undefined)
        return fallback;
    throw new Error(`Missing required env: ${name}`);
}
function getProgramId() {
    const programIdStr = getEnv("PROGRAM_ID", "7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf");
    return new web3_js_1.PublicKey(programIdStr);
}
function getRpcUrl() {
    return getEnv("SOLANA_RPC_URL", "https://api.devnet.solana.com");
}
function getConnection() {
    return new web3_js_1.Connection(getRpcUrl(), "confirmed");
}
function tryLoadKeypairFromPath(filePath) {
    if (!filePath)
        return undefined;
    try {
        const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        const file = fs.readFileSync(resolved, "utf8");
        const json = JSON.parse(file);
        if (Array.isArray(json)) {
            return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(json));
        }
        if (json.secretKey && Array.isArray(json.secretKey)) {
            return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(json.secretKey));
        }
    }
    catch (_) {
    }
    return undefined;
}
function tryLoadKeypairFromEnv(secret) {
    if (!secret)
        return undefined;
    try {
        if (secret.trim().startsWith("[")) {
            const arr = JSON.parse(secret);
            return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(arr));
        }
        return tryLoadKeypairFromPath(secret);
    }
    catch (_) {
        return undefined;
    }
}
function getOracleKeypair() {
    const filePath = process.env.ORACLE_KEYPAIR_PATH;
    const secret = process.env.ORACLE_SECRET_KEY;
    const loaded = tryLoadKeypairFromPath(filePath) || tryLoadKeypairFromEnv(secret);
    if (loaded)
        return loaded;
    throw new Error("Oracle keypair not configured. Set ORACLE_KEYPAIR_PATH or ORACLE_SECRET_KEY.");
}
function getWallet() {
    const kp = getOracleKeypair();
    return new anchor.Wallet(kp);
}
//# sourceMappingURL=config.js.map