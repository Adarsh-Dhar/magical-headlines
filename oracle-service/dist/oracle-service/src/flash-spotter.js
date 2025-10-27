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
exports.FlashMarketSpotter = void 0;
const flash_trend_detector_1 = require("./flash-trend-detector");
const client_1 = require("@prisma/client");
const config_1 = require("./config");
const anchor = __importStar(require("@coral-xyz/anchor"));
const news_platform_json_1 = __importDefault(require("../../contract/target/idl/news_platform.json"));
const notification_bus_1 = require("../../lib/notification-bus");
const prisma = new client_1.PrismaClient();
class FlashMarketSpotter {
    constructor() {
        this.detector = new flash_trend_detector_1.FlashTrendDetector();
        this.isRunning = false;
        const connection = (0, config_1.getConnection)();
        const wallet = (0, config_1.getWallet)();
        const provider = new anchor.AnchorProvider(connection, wallet, {});
        this.program = new anchor.Program(news_platform_json_1.default, provider);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning)
                return;
            this.isRunning = true;
            console.log("🔍 Flash Market Spotter started");
            setInterval(() => this.scanForSpikes(), 2000);
            setInterval(() => this.resolveExpiredMarkets(), 5000);
        });
    }
    scanForSpikes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const trending = yield prisma.token.findMany({
                    where: { trendIndexScore: { gt: 30 } },
                    orderBy: { trendVelocity: 'desc' },
                    take: 20,
                });
                for (const token of trending) {
                    const { detected, velocity } = yield this.detector.detectVelocitySpike(token.id);
                    if (detected) {
                        yield this.createFlashMarket(token.id, velocity);
                    }
                }
            }
            catch (error) {
                console.error("Error scanning for spikes:", error);
            }
        });
    }
    createFlashMarket(tokenId, velocity) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const flashMarket = yield this.detector.createFlashMarket(tokenId, velocity);
                const token = yield prisma.token.findUnique({ where: { id: tokenId } });
                if (!(token === null || token === void 0 ? void 0 : token.newsAccount))
                    return;
                const newsAccountPubkey = new anchor.web3.PublicKey(token.newsAccount);
                const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("market"), newsAccountPubkey.toBuffer()], this.program.programId);
                const velocityScaled = Math.floor(velocity * 1000);
                const [whitelistPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("whitelist"), this.program.provider.publicKey.toBuffer()], this.program.programId);
                yield this.program.methods
                    .createFlashMarket(new anchor.BN(velocityScaled), new anchor.BN(60))
                    .accounts({
                    market: marketPda,
                    newsAccount: newsAccountPubkey,
                    whitelist: whitelistPda,
                    oracleAuthority: this.program.provider.publicKey,
                })
                    .rpc();
                (0, notification_bus_1.emitNotification)('broadcast', {
                    type: 'FLASH_MARKET_CREATED',
                    marketId: flashMarket.id,
                    tokenId,
                    velocity,
                    endTime: flashMarket.endTimestamp,
                });
                console.log(`⚡ Flash market created for token ${tokenId}`);
            }
            catch (error) {
                console.error("Error creating flash market:", error);
            }
        });
    }
    resolveExpiredMarkets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const expired = yield prisma.flashTrendMarket.findMany({
                    where: {
                        isActive: true,
                        isResolved: false,
                        endTimestamp: { lte: new Date() },
                    },
                });
                for (const market of expired) {
                    yield this.resolveMarket(market);
                }
            }
            catch (error) {
                console.error("Error resolving markets:", error);
            }
        });
    }
    resolveMarket(market) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const history = yield prisma.trendIndexHistory.findMany({
                    where: { tokenId: market.parentTokenId },
                    orderBy: { timestamp: 'desc' },
                    take: 2,
                });
                if (history.length < 2)
                    return;
                const timeDiff = (history[0].timestamp.getTime() - history[1].timestamp.getTime()) / 1000;
                const scoreDiff = history[0].score - history[1].score;
                const finalVelocity = timeDiff > 0 ? scoreDiff / timeDiff : 0;
                const velocityChange = finalVelocity - market.initialVelocity;
                const winningSide = velocityChange >= 0 ? 'up' : 'down';
                yield this.calculatePayouts(market.id, winningSide, Math.abs(velocityChange));
                yield prisma.flashTrendMarket.update({
                    where: { id: market.id },
                    data: {
                        isActive: false,
                        isResolved: true,
                        finalVelocity,
                        winningSide,
                    },
                });
                const token = yield prisma.token.findUnique({
                    where: { id: market.parentTokenId }
                });
                if (token === null || token === void 0 ? void 0 : token.newsAccount) {
                    const newsAccountPubkey = new anchor.web3.PublicKey(token.newsAccount);
                    const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("market"), newsAccountPubkey.toBuffer()], this.program.programId);
                    const [whitelistPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("whitelist"), this.program.provider.publicKey.toBuffer()], this.program.programId);
                    yield this.program.methods
                        .closeFlashMarket(new anchor.BN(Math.floor(finalVelocity * 1000)))
                        .accounts({
                        market: marketPda,
                        newsAccount: newsAccountPubkey,
                        whitelist: whitelistPda,
                        oracleAuthority: this.program.provider.publicKey,
                    })
                        .rpc();
                }
                console.log(`✅ Flash market ${market.id} resolved: ${winningSide}`);
            }
            catch (error) {
                console.error("Error resolving market:", error);
            }
        });
    }
    calculatePayouts(marketId, winningSide, magnitude) {
        return __awaiter(this, void 0, void 0, function* () {
            const positions = yield prisma.flashTrendPosition.findMany({
                where: { marketId, isResolved: false },
            });
            const winners = positions.filter(p => p.direction === winningSide);
            const losers = positions.filter(p => p.direction !== winningSide);
            const totalWinAmount = winners.reduce((sum, p) => sum + p.amount, 0);
            const totalLoseAmount = losers.reduce((sum, p) => sum + p.amount, 0);
            for (const winner of winners) {
                const share = totalWinAmount > 0 ? winner.amount / totalWinAmount : 0;
                const payout = winner.amount + (totalLoseAmount * share);
                const profitLoss = payout - winner.amount;
                yield prisma.flashTrendPosition.update({
                    where: { id: winner.id },
                    data: {
                        isResolved: true,
                        payout,
                        profitLoss,
                    },
                });
            }
            for (const loser of losers) {
                yield prisma.flashTrendPosition.update({
                    where: { id: loser.id },
                    data: {
                        isResolved: true,
                        payout: 0,
                        profitLoss: -loser.amount,
                    },
                });
            }
        });
    }
}
exports.FlashMarketSpotter = FlashMarketSpotter;
//# sourceMappingURL=flash-spotter.js.map