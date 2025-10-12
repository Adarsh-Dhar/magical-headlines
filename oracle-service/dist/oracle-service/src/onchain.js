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
exports.updateOnChainSummary = updateOnChainSummary;
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const news_platform_json_1 = __importDefault(require("../../contract/target/idl/news_platform.json"));
const PROGRAM_ID = new web3_js_1.PublicKey("7RaYxrc55bJSewXZMcPASrcjaGwSy8soVR4Q3KiGcjvf");
const connection = new web3_js_1.Connection("https://api.devnet.solana.com", "confirmed");
const oracleKeypair = anchor.web3.Keypair.generate();
const wallet = new anchor.Wallet(oracleKeypair);
function updateOnChainSummary(newsAccountPubkey, summaryLink) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
        const program = new anchor.Program(news_platform_json_1.default, provider);
        const [whitelistPda, _] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("whitelist"), oracleKeypair.publicKey.toBuffer()], program.programId);
        try {
            const txSignature = yield program.methods
                .updateSummaryLink(summaryLink)
                .accounts({
                newsAccount: newsAccountPubkey,
                whitelist: whitelistPda,
                oracleAuthority: oracleKeypair.publicKey,
            })
                .rpc();
            console.log(`Successfully updated summary on-chain. Transaction: ${txSignature}`);
        }
        catch (error) {
            console.error("Failed to update summary on-chain:", error);
        }
    });
}
//# sourceMappingURL=onchain.js.map