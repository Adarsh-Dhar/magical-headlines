"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTokensPurchasedEvent = parseTokensPurchasedEvent;
exports.parseTokensSoldEvent = parseTokensSoldEvent;
exports.parseTokensStakedEvent = parseTokensStakedEvent;
exports.parseTokensUnstakedEvent = parseTokensUnstakedEvent;
exports.parseFeesClaimedEvent = parseFeesClaimedEvent;
function parseTokensPurchasedEvent(event) {
    return {
        buyer: event.buyer.toString(),
        amount: Number(event.amount),
        cost: Number(event.cost),
        newSupply: Number(event.newSupply)
    };
}
function parseTokensSoldEvent(event) {
    return {
        seller: event.seller.toString(),
        amount: Number(event.amount),
        refund: Number(event.refund),
        newSupply: Number(event.newSupply)
    };
}
function parseTokensStakedEvent(event) {
    return {
        author: event.author.toString(),
        market: event.market.toString(),
        amount: Number(event.amount),
        totalStaked: Number(event.totalStaked)
    };
}
function parseTokensUnstakedEvent(event) {
    return {
        author: event.author.toString(),
        market: event.market.toString(),
        amount: Number(event.amount),
        totalStaked: Number(event.totalStaked)
    };
}
function parseFeesClaimedEvent(event) {
    return {
        author: event.author.toString(),
        market: event.market.toString(),
        amount: Number(event.amount)
    };
}
//# sourceMappingURL=events.js.map