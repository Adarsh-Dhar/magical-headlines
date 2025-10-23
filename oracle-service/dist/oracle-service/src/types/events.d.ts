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
export interface TokensStakedEvent {
    author: string;
    market: string;
    amount: number;
    totalStaked: number;
}
export interface TokensUnstakedEvent {
    author: string;
    market: string;
    amount: number;
    totalStaked: number;
}
export interface FeesClaimedEvent {
    author: string;
    market: string;
    amount: number;
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
export declare function parseTokensStakedEvent(event: any): TokensStakedEvent;
export declare function parseTokensUnstakedEvent(event: any): TokensUnstakedEvent;
export declare function parseFeesClaimedEvent(event: any): FeesClaimedEvent;
//# sourceMappingURL=events.d.ts.map