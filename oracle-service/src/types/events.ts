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

export function parseTokensPurchasedEvent(event: any): TokensPurchasedEvent {
  return {
    buyer: event.buyer.toString(),
    amount: Number(event.amount),
    cost: Number(event.cost),
    newSupply: Number(event.newSupply)
  };
}

export function parseTokensSoldEvent(event: any): TokensSoldEvent {
  return {
    seller: event.seller.toString(),
    amount: Number(event.amount),
    refund: Number(event.refund),
    newSupply: Number(event.newSupply)
  };
}
