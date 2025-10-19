export interface TokensPurchasedEvent {
    buyer: string;
    amount: number;
    cost: number;
    newSupply: number;
}
export interface TokensSoldEvent {
    seller: string;
    amount: number;
    refund: number;
    newSupply: number;
}
export interface TradingEventData {
    type: 'purchased' | 'sold';
    trader: string;
    amount: number;
    price: number;
    totalValue: number;
    newSupply: number;
    timestamp: Date;
    signature: string;
}
export declare function parseTokensPurchasedEvent(event: any): TokensPurchasedEvent;
export declare function parseTokensSoldEvent(event: any): TokensSoldEvent;
//# sourceMappingURL=events.d.ts.map