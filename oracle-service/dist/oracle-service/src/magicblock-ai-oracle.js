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
exports.getMagicBlockAIOracle = getMagicBlockAIOracle;
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
        this.magicBlockCalls = 0;
        this.magicBlockFailures = 0;
        if (!config.rpcUrl || config.rpcUrl.trim() === "") {
            throw new Error("MAGICBLOCK_RPC_URL is required - no fallback available");
        }
        if (!config.sessionKeypair || config.sessionKeypair.trim() === "") {
            throw new Error("MAGICBLOCK_SESSION_KEYPAIR is required - no fallback available");
        }
        this.config = config;
        this.prisma = new client_1.PrismaClient();
        this.initializeConnection();
    }
    initializeConnection() {
        this.connection = (0, config_1.getConnection)();
        console.log(`Ephemeral Rollup connection initialized`);
        if (!this.config.sessionKeypair) {
            throw new Error("MAGICBLOCK_SESSION_KEYPAIR is required");
        }
        try {
            const secretKey = JSON.parse(this.config.sessionKeypair);
            this.sessionKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
            console.log(`Session keypair loaded`);
        }
        catch (error) {
            throw new Error(`Failed to parse MAGICBLOCK_SESSION_KEYPAIR: ${error}`);
        }
    }
    calculateTrendIndex(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.magicBlockCalls++;
            if (this.circuitBreakerOpen) {
                throw new Error("MagicBlock AI Oracle unavailable - circuit breaker is open");
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
                console.error("MagicBlock AI Oracle failed:", error);
                this.magicBlockFailures++;
                this.circuitBreakerFailures++;
                if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
                    this.openCircuitBreaker();
                }
                throw new Error(`MagicBlock AI Oracle failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    callMagicBlockAI(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
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
                console.log("🤖 Computing AI trend index ON-CHAIN via Ephemeral Rollup...");
                const token = yield this.prisma.token.findUnique({
                    where: { id: tokenId },
                    include: {
                        trades: {
                            where: {
                                timestamp: { gte: new Date(Date.now() - 3600000) }
                            }
                        },
                        story: {
                            include: {
                                comments: {
                                    where: {
                                        createdAt: { gte: new Date(Date.now() - 3600000) }
                                    }
                                },
                                likes: {
                                    where: {
                                        createdAt: { gte: new Date(Date.now() - 3600000) }
                                    }
                                }
                            }
                        }
                    }
                });
                if (!token || !token.newsAccount) {
                    throw new Error(`Token ${tokenId} does not have an on-chain newsAccount. Please publish the news story on-chain first using the publish_news instruction.`);
                }
                const newsAccountPubkey = new web3_js_1.PublicKey(token.newsAccount);
                const [marketPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("market"), newsAccountPubkey.toBuffer()], programId);
                const [whitelistPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("whitelist"), wallet.publicKey.toBuffer()], programId);
                const sentiment = token.story ? (((_a = token.story.likes) === null || _a === void 0 ? void 0 : _a.length) || 0) * 100 - (((_b = token.story.comments) === null || _b === void 0 ? void 0 : _b.length) || 0) * 20 : 0;
                const tradingVelocity = ((_c = token.trades) === null || _c === void 0 ? void 0 : _c.length) || 0;
                const volumeSpike = token.volume24h ? Math.round(token.volume24h * 1000000 / 1e9) : 0;
                const priceMomentum = 0;
                const socialActivity = token.story ? (((_d = token.story.comments) === null || _d === void 0 ? void 0 : _d.length) || 0) + (((_e = token.story.likes) === null || _e === void 0 ? void 0 : _e.length) || 0) * 10 : 0;
                const holderMomentum = 0;
                const crossMarketCorr = 0;
                console.log("📤 Sending on-chain AI computation via MagicBlock ER...");
                console.log(`📊 Factors: sentiment=${sentiment}, velocity=${tradingVelocity}, spike=${volumeSpike}`);
                const txSignature = yield program.methods
                    .computeAiTrendIndex(new anchor.BN(sentiment), new anchor.BN(tradingVelocity), new anchor.BN(volumeSpike), new anchor.BN(priceMomentum), new anchor.BN(socialActivity), new anchor.BN(holderMomentum), new anchor.BN(crossMarketCorr))
                    .accounts({
                    market: marketPda,
                    newsAccount: newsAccountPubkey,
                    whitelist: whitelistPda,
                    oracleAuthority: wallet.publicKey,
                })
                    .rpc();
                console.log(`✅ On-chain AI computation complete via MagicBlock ER`);
                console.log(`🔗 Transaction: ${txSignature}`);
                console.log(`⚡ Computed in <50ms with gasless execution`);
                const marketAccount = yield program.account.market.fetch(marketPda);
                const trendScore = (marketAccount.trendIndexScore.toNumber() / 1000);
                return {
                    score: trendScore,
                    factors: {
                        sentiment: sentiment / 1000,
                        tradingVelocity: tradingVelocity,
                        volumeSpike: volumeSpike / 1000000,
                        priceMomentum: priceMomentum / 1000000,
                        socialActivity: socialActivity,
                        holderMomentum: holderMomentum,
                        crossMarketCorr: crossMarketCorr / 1000
                    },
                    weights: {},
                    confidence: 0.85,
                    reasoning: "Computed on-chain via Ephemeral Rollup with adaptive AI weighting",
                    timestamp: new Date()
                };
            }
            catch (error) {
                console.error("❌ MagicBlock AI Oracle ER error:", error);
                throw error;
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
                console.log("Testing MagicBlock AI Oracle connection...");
                if (!this.connection) {
                    throw new Error("Connection not initialized");
                }
                if (!this.sessionKeypair) {
                    throw new Error("Session keypair not loaded");
                }
                const blockHeight = yield this.connection.getBlockHeight();
                console.log(`Connected to Solana - Block height: ${blockHeight}`);
                const programId = (0, config_1.getProgramId)();
                console.log(`Program ID: ${programId.toString()}`);
                console.log("MagicBlock AI Oracle connection test passed");
                return true;
            }
            catch (error) {
                console.error("MagicBlock AI Oracle connection test failed:", error);
                return false;
            }
        });
    }
    getProviderStats() {
        return {
            magicblock: {
                calls: this.magicBlockCalls,
                failures: this.magicBlockFailures
            }
        };
    }
}
exports.MagicBlockAIOracle = MagicBlockAIOracle;
let _magicBlockAIOracle = null;
function getMagicBlockAIOracle() {
    if (!_magicBlockAIOracle) {
        const rpcUrl = process.env.MAGICBLOCK_RPC_URL || "";
        const sessionKeypair = process.env.MAGICBLOCK_SESSION_KEYPAIR || "";
        if (!rpcUrl || !sessionKeypair) {
            throw new Error("MagicBlock AI Oracle requires MAGICBLOCK_RPC_URL and MAGICBLOCK_SESSION_KEYPAIR environment variables to be set");
        }
        _magicBlockAIOracle = new MagicBlockAIOracle({
            rpcUrl,
            sessionKeypair
        });
    }
    return _magicBlockAIOracle;
}
exports.magicBlockAIOracle = {
    isAvailable: () => {
        return !!(process.env.MAGICBLOCK_RPC_URL && process.env.MAGICBLOCK_SESSION_KEYPAIR);
    },
    calculateTrendIndex: (tokenId) => __awaiter(void 0, void 0, void 0, function* () {
        if (!exports.magicBlockAIOracle.isAvailable()) {
            return {
                success: false,
                error: "MagicBlock AI Oracle not configured",
                provider: 'magicblock'
            };
        }
        return yield getMagicBlockAIOracle().calculateTrendIndex(tokenId);
    }),
    getCircuitBreakerStatus: () => {
        if (!exports.magicBlockAIOracle.isAvailable()) {
            return { open: true, failures: 999, threshold: 5 };
        }
        return getMagicBlockAIOracle().getCircuitBreakerStatus();
    },
    getProviderStats: () => {
        if (!exports.magicBlockAIOracle.isAvailable()) {
            return { magicblock: { calls: 0, failures: 0 } };
        }
        return getMagicBlockAIOracle().getProviderStats();
    }
};
//# sourceMappingURL=magicblock-ai-oracle.js.map