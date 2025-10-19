"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTokensPurchasedEvent = parseTokensPurchasedEvent;
exports.parseTokensSoldEvent = parseTokensSoldEvent;
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
//# sourceMappingURL=events.js.map