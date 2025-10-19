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
const client_1 = require("@prisma/client");
const events_1 = require("./types/events");
const prisma = new client_1.PrismaClient();
function processTokensPurchasedEvent(event, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventData = (0, events_1.parseTokensPurchasedEvent)(event);
            console.log('Processing TokensPurchased event:', eventData);
            const token = yield findTokenByMarketAccount(eventData);
            if (!token) {
                console.log('Token not found for purchase event, skipping...');
                return;
            }
            yield createOrUpdateUser(eventData.buyer);
            const trade = yield prisma.trade.create({
                data: {
                    type: 'BUY',
                    amount: eventData.amount,
                    priceAtTrade: eventData.cost / eventData.amount,
                    trader: {
                        connect: { walletAddress: eventData.buyer }
                    },
                    token: {
                        connect: { id: token.id }
                    },
                    timestamp: new Date()
                }
            });
            yield updateTokenStatistics(token.id);
            console.log('Successfully processed TokensPurchased event:', trade.id);
        }
        catch (error) {
            console.error('Error processing TokensPurchased event:', error);
        }
    });
}
function processTokensSoldEvent(event, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventData = (0, events_1.parseTokensSoldEvent)(event);
            console.log('Processing TokensSold event:', eventData);
            const token = yield findTokenByMarketAccount(eventData);
            if (!token) {
                console.log('Token not found for sell event, skipping...');
                return;
            }
            yield createOrUpdateUser(eventData.seller);
            const trade = yield prisma.trade.create({
                data: {
                    type: 'SELL',
                    amount: eventData.amount,
                    priceAtTrade: eventData.refund / eventData.amount,
                    trader: {
                        connect: { walletAddress: eventData.seller }
                    },
                    token: {
                        connect: { id: token.id }
                    },
                    timestamp: new Date()
                }
            });
            yield updateTokenStatistics(token.id);
            console.log('Successfully processed TokensSold event:', trade.id);
        }
        catch (error) {
            console.error('Error processing TokensSold event:', error);
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
            console.error('Error creating/updating user:', error);
        }
    });
}
function findTokenByMarketAccount(eventData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tokens = yield prisma.token.findMany({
                include: {
                    story: true
                }
            });
            return tokens[0] || null;
        }
        catch (error) {
            console.error('Error finding token by market account:', error);
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
            console.log(`Updated token ${tokenId} statistics:`, {
                price: currentPrice,
                priceChange24h,
                volume24h
            });
        }
        catch (error) {
            console.error('Error updating token statistics:', error);
        }
    });
}
//# sourceMappingURL=trading-events.js.map