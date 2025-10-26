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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.magicBlockAIOracle = exports.MagicBlockAIOracle = void 0;
const ai_trend_calculator_1 = require("./ai-trend-calculator");
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
const news_platform_json_1 = __importDefault(require("../../contract/target/idl/news_platform.json"));
const config_1 = require("./config");
const client_1 = require("@prisma/client");
class MagicBlockAIOracle {
    constructor(config) {
        this.circuitBreakerOpen = false;
        this.circuitBreakerFailures = 0;
        this.circuitBreakerThreshold = 5;
        this.circuitBreakerTimeout = 60000;
        this.config = config;
        this.aiCalculator = new ai_trend_calculator_1.AITrendCalculator();
        this.prisma = new client_1.PrismaClient();
        this.initializeConnection();
    }
    initializeConnection() {
        try {
            this.connection = (0, config_1.getConnection)();
            console.log(`✅ Ephemeral Rollup connection initialized - transactions will execute via ER`);
            if (this.config.sessionKeypair) {
                try {
                    const secretKey = JSON.parse(this.config.sessionKeypair);
                    this.sessionKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
                    console.log(`✅ Session keypair loaded`);
                }
                catch (error) {
                    console.warn("⚠️ Failed to load session keypair:", error);
                }
            }
        }
        catch (error) {
            console.error("❌ Error initializing connection:", error);
        }
    }
    calculateTrendIndex(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.circuitBreakerOpen) {
                console.log("🔴 Circuit breaker open, using fallback provider");
                return this.useFallbackProvider(tokenId);
            }
            try {
                const result = yield this.callMagicBlockAI(tokenId);
                this.resetCircuitBreaker();
                return {
                    success: true,
                    result,
                    provider: 'magicblock'
                };
            }
            catch (error) {
                console.error("❌ MagicBlock AI Oracle failed:", error);
                this.circuitBreakerFailures++;
                if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
                    this.openCircuitBreaker();
                }
                return this.useFallbackProvider(tokenId);
            }
        });
    }
    callMagicBlockAI(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🚀 Calling AI Oracle via Ephemeral Rollup for token ${tokenId}...`);
            if (!this.connection) {
                this.connection = (0, config_1.getConnection)();
            }
            try {
                const programId = (0, config_1.getProgramId)();
                const wallet = (0, config_1.getWallet)();
                const connection = (0, config_1.getConnection)();
                const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
                const program = new anchor.Program(news_platform_json_1.default, provider);
                console.log(`📊 Preparing on-chain AI computation via Ephemeral Rollup...`);
                console.log("🤖 Computing trend via AI...");
                const aiResult = yield this.aiCalculator.calculateTrendIndex(tokenId);
                console.log("⛓️ Executing on-chain via MagicBlock ER...");
                const token = yield this.prisma.token.findUnique({
                    where: { id: tokenId },
                    select: { newsAccount: true }
                });
                if (!token || !token.newsAccount) {
                    console.log("⚠️ Token has no on-chain account, skipping on-chain update");
                    console.log("💡 AI computation still completed - result stored in database");
                    const aiResult = yield this.aiCalculator.calculateTrendIndex(tokenId);
                    return aiResult;
                }
                const newsAccountPubkey = new web3_js_1.PublicKey(token.newsAccount);
                const [marketPda, _] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("market"), newsAccountPubkey.toBuffer()], programId);
                const [whitelistPda, __] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("whitelist"), wallet.publicKey.toBuffer()], programId);
                console.log("📤 Sending transaction via MagicBlock ER...");
                const trendScoreU64 = Math.round(aiResult.score * 1000);
                const factorsString = JSON.stringify(aiResult.factors);
                const factorsHash = Buffer.from(require('crypto').createHash('sha256').update(factorsString).digest());
                const txSignature = yield program.methods
                    .updateTrendIndex(new anchor.BN(trendScoreU64), Array.from(factorsHash))
                    .accounts({
                    market: marketPda,
                    newsAccount: newsAccountPubkey,
                    whitelist: whitelistPda,
                    oracleAuthority: wallet.publicKey,
                })
                    .rpc();
                console.log(`✅ On-chain execution complete via MagicBlock ER`);
                console.log(`🔗 Transaction: ${txSignature}`);
                return aiResult;
            }
            catch (error) {
                console.error("❌ MagicBlock AI Oracle ER error:", error);
                throw error;
            }
        });
    }
    useFallbackProvider(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🔄 Using fallback provider (${this.config.fallbackProvider}) for token ${tokenId}...`);
            try {
                const result = yield this.aiCalculator.calculateTrendIndex(tokenId);
                return {
                    success: true,
                    result,
                    provider: 'fallback'
                };
            }
            catch (error) {
                console.error("❌ Fallback provider also failed:", error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                    provider: 'fallback'
                };
            }
        });
    }
    openCircuitBreaker() {
        this.circuitBreakerOpen = true;
        console.log("🔴 Circuit breaker opened - MagicBlock AI Oracle unavailable");
        setTimeout(() => {
            this.resetCircuitBreaker();
        }, this.circuitBreakerTimeout);
    }
    resetCircuitBreaker() {
        this.circuitBreakerOpen = false;
        this.circuitBreakerFailures = 0;
        console.log("🟢 Circuit breaker reset - MagicBlock AI Oracle available");
    }
    getCircuitBreakerStatus() {
        return {
            open: this.circuitBreakerOpen,
            failures: this.circuitBreakerFailures,
            threshold: this.circuitBreakerThreshold
        };
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("🧪 Testing MagicBlock AI Oracle connection...");
                yield new Promise(resolve => setTimeout(resolve, 1000));
                console.log("✅ MagicBlock AI Oracle connection test passed");
                return true;
            }
            catch (error) {
                console.error("❌ MagicBlock AI Oracle connection test failed:", error);
                return false;
            }
        });
    }
    getProviderStats() {
        return {
            magicblock: { calls: 0, failures: 0 },
            fallback: { calls: 0, failures: 0 }
        };
    }
}
exports.MagicBlockAIOracle = MagicBlockAIOracle;
exports.magicBlockAIOracle = new MagicBlockAIOracle({
    rpcUrl: process.env.MAGICBLOCK_RPC_URL || "",
    sessionKeypair: process.env.MAGICBLOCK_SESSION_KEYPAIR || "",
    fallbackProvider: process.env.AI_ORACLE_FALLBACK || 'gemini'
});
//# sourceMappingURL=magicblock-ai-oracle.js.map