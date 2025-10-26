import { PublicKey } from "@solana/web3.js";
import { TrendCalculationResult } from "./ai-trend-calculator";
export declare function updateOnChainSummary(newsAccountPubkey: PublicKey, summaryLink: string): Promise<void>;
export declare function updateTrendIndexOnChain(newsAccountPubkey: PublicKey, trendResult: TrendCalculationResult): Promise<string>;
//# sourceMappingURL=onchain.d.ts.map