"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTokensPurchasedEvent = processTokensPurchasedEvent;
exports.processTokensSoldEvent = processTokensSoldEvent;
exports.processTokensStakedEvent = processTokensStakedEvent;
exports.processTokensUnstakedEvent = processTokensUnstakedEvent;
exports.processFeesClaimedEvent = processFeesClaimedEvent;
const client_1 = require("@prisma/client");
const events_1 = require("./types/events");
const prisma = new client_1.PrismaClient();
function alignToUtcMinute(date) {
    const ms = date.getTime();
    return new Date(Math.floor(ms / 60000) * 60000);
}
function upsertTokenVolumeMinute(tokenId, timestamp, volumeSol, tradeType) {
    return __awaiter(this, void 0, void 0, function* () {
        const minute = alignToUtcMinute(timestamp);
        const existing = yield prisma.tokenVolumeMinute.findUnique({
            where: {
                UniqueTokenMinute: { tokenId, minute }
            }
        });
        if (existing) {
            const updated = yield prisma.tokenVolumeMinute.update({
                where: { id: existing.id },
                data: {
                    volumeSol: existing.volumeSol + volumeSol,
                    tradeCount: existing.tradeCount + 1,
                    buyVolumeSol: tradeType === 'BUY'
                        ? existing.buyVolumeSol + volumeSol
                        : existing.buyVolumeSol,
                    sellVolumeSol: tradeType === 'SELL'
                        ? existing.sellVolumeSol + volumeSol
                        : existing.sellVolumeSol,
                }
            });
        }
        else {
            const created = yield prisma.tokenVolumeMinute.create({
                data: {
                    tokenId,
                    minute,
                    volumeSol,
                    tradeCount: 1,
                    buyVolumeSol: tradeType === 'BUY' ? volumeSol : 0,
                    sellVolumeSol: tradeType === 'SELL' ? volumeSol : 0,
                }
            });
        }
    });
}
function processTokensPurchasedEvent(event, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventData = (0, events_1.parseTokensPurchasedEvent)(event);
            const token = yield findTokenByMarketAccount(eventData);
            if (!token) {
                return;
            }
            yield createOrUpdateUser(eventData.buyer);
            const trade = yield prisma.trade.create({
                data: {
                    type: 'BUY',
                    amount: eventData.amount,
                    priceAtTrade: eventData.cost / eventData.amount,
                    costInSol: eventData.cost,
                    signature: signature,
                    trader: {
                        connect: { walletAddress: eventData.buyer }
                    },
                    token: {
                        connect: { id: token.id }
                    },
                    timestamp: new Date()
                }
            });
            yield upsertTokenVolumeMinute(token.id, trade.timestamp, eventData.cost, 'BUY');
            yield updateTokenStatistics(token.id);
        }
        catch (error) {
        }
    });
}
function processTokensSoldEvent(event, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventData = (0, events_1.parseTokensSoldEvent)(event);
            const token = yield findTokenByMarketAccount(eventData);
            if (!token) {
                return;
            }
            yield createOrUpdateUser(eventData.seller);
            const trade = yield prisma.trade.create({
                data: {
                    type: 'SELL',
                    amount: eventData.amount,
                    priceAtTrade: eventData.refund / eventData.amount,
                    costInSol: eventData.refund,
                    signature: signature,
                    trader: {
                        connect: { walletAddress: eventData.seller }
                    },
                    token: {
                        connect: { id: token.id }
                    },
                    timestamp: new Date()
                }
            });
            yield upsertTokenVolumeMinute(token.id, trade.timestamp, eventData.refund, 'SELL');
            yield updateTokenStatistics(token.id);
        }
        catch (error) {
        }
    });
}
function processTokensStakedEvent(event, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventData = (0, events_1.parseTokensStakedEvent)(event);
            const token = yield findTokenByMarketAccount(eventData);
            if (!token) {
                return;
            }
            yield prisma.token.update({
                where: { id: token.id },
                data: {
                    stakedTokens: eventData.totalStaked
                }
            });
        }
        catch (error) {
        }
    });
}
function processTokensUnstakedEvent(event, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventData = (0, events_1.parseTokensUnstakedEvent)(event);
            const token = yield findTokenByMarketAccount(eventData);
            if (!token) {
                return;
            }
            yield prisma.token.update({
                where: { id: token.id },
                data: {
                    stakedTokens: eventData.totalStaked
                }
            });
        }
        catch (error) {
        }
    });
}
function processFeesClaimedEvent(event, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventData = (0, events_1.parseFeesClaimedEvent)(event);
            const token = yield findTokenByMarketAccount(eventData);
            if (!token) {
                return;
            }
            yield prisma.token.update({
                where: { id: token.id },
                data: {
                    accumulatedFees: 0
                }
            });
        }
        catch (error) {
        }
    });
}
function createOrUpdateUser(walletAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.user.upsert({
                where: { walletAddress },
                update: {},
                create: {
                    walletAddress,
                    name: null
                }
            });
        }
        catch (error) {
        }
    });
}
function findTokenByMarketAccount(eventData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (eventData.marketAccount) {
                const token = yield prisma.token.findUnique({
                    where: { marketAccount: eventData.marketAccount },
                    include: { story: true }
                });
                if (token) {
                    return token;
                }
            }
            if (eventData.newsAccount) {
                const token = yield prisma.token.findUnique({
                    where: { newsAccount: eventData.newsAccount },
                    include: { story: true }
                });
                if (token) {
                    return token;
                }
            }
            const tokens = yield prisma.token.findMany({
                include: { story: true }
            });
            if (tokens.length > 0) {
                return tokens[0];
            }
            return null;
        }
        catch (error) {
            return null;
        }
    });
}
function updateTokenStatistics(tokenId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const trades = yield prisma.trade.findMany({
                where: {
                    tokenId,
                    timestamp: {
                        gte: oneDayAgo
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });
            if (trades.length === 0)
                return;
            const volume24h = trades.reduce((sum, trade) => {
                return sum + (trade.amount * trade.priceAtTrade);
            }, 0);
            const currentPrice = trades[0].priceAtTrade;
            const oldestPrice = trades[trades.length - 1].priceAtTrade;
            const priceChange24h = oldestPrice > 0 ? ((currentPrice - oldestPrice) / oldestPrice) * 100 : 0;
            yield prisma.token.update({
                where: { id: tokenId },
                data: {
                    price: currentPrice,
                    priceChange24h,
                    volume24h,
                    marketCap: currentPrice * 100
                }
            });
        }
        catch (error) {
        }
    });
}
//# sourceMappingURL=trading-events.js.map