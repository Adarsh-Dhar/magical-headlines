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
exports.FlashTrendDetector = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class FlashTrendDetector {
    constructor() {
        this.velocityThreshold = 5.0;
        this.recentTriggers = new Map();
        this.cooldownMs = 120000;
    }
    detectVelocitySpike(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            const history = yield prisma.trendIndexHistory.findMany({
                where: { tokenId },
                orderBy: { timestamp: 'desc' },
                take: 3,
            });
            if (history.length < 3) {
                return { detected: false, velocity: 0 };
            }
            const timeDiff = (history[0].timestamp.getTime() - history[1].timestamp.getTime()) / 1000;
            const scoreDiff = history[0].score - history[1].score;
            const velocity = timeDiff > 0 ? scoreDiff / timeDiff : 0;
            const lastTrigger = this.recentTriggers.get(tokenId);
            if (lastTrigger && Date.now() - lastTrigger.getTime() < this.cooldownMs) {
                return { detected: false, velocity };
            }
            if (Math.abs(velocity) > this.velocityThreshold) {
                this.recentTriggers.set(tokenId, new Date());
                return { detected: true, velocity };
            }
            return { detected: false, velocity };
        });
    }
    createFlashMarket(tokenId, initialVelocity) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield prisma.token.findUnique({
                where: { id: tokenId },
                include: {
                    trendIndexHistory: {
                        orderBy: { timestamp: 'desc' },
                        take: 1
                    }
                }
            });
            if (!token)
                throw new Error('Token not found');
            const endTime = new Date(Date.now() + 60000);
            return yield prisma.flashTrendMarket.create({
                data: {
                    parentTokenId: tokenId,
                    trendSnapshot: token.trendFactorWeights || {},
                    startTimestamp: new Date(),
                    endTimestamp: endTime,
                    initialVelocity,
                    isActive: true,
                }
            });
        });
    }
}
exports.FlashTrendDetector = FlashTrendDetector;
//# sourceMappingURL=flash-trend-detector.js.map