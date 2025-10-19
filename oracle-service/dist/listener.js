#!/usr/bin/env tsx
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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const anchor = __importStar(require("@coral-xyz/anchor"));
const config_1 = require("./config");
const article_1 = require("./article");
const news_platform_json_1 = __importDefault(require("../../contract1/target/idl/news_platform.json"));
function processExistingAccounts() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = (0, config_1.getConnection)();
            const programId = (0, config_1.getProgramId)();
            console.log("🔍 Processing existing news accounts without summaries...");
            const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
            const provider = new anchor.AnchorProvider(connection, wallet, {});
            const program = new anchor.Program(news_platform_json_1.default, provider);
            const accounts = yield program.account.newsAccount.all();
            console.log(`📊 Found ${accounts.length} total news accounts`);
            let processedCount = 0;
            let skippedCount = 0;
            for (const account of accounts) {
                try {
                    if (account.account.summaryLink && account.account.summaryLink.trim() !== "") {
                        skippedCount++;
                        continue;
                    }
                    console.log(`🔄 Processing account without summary: ${account.publicKey.toBase58()}`);
                    console.log(`   Headline: ${account.account.headline}`);
                    const accountInfo = yield connection.getAccountInfo(account.publicKey);
                    if (accountInfo) {
                        yield (0, article_1.handleNewArticle)(account.publicKey, accountInfo.data);
                    }
                    processedCount++;
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (error) {
                    console.error(`❌ Error processing account ${account.publicKey.toBase58()}:`, error);
                }
            }
            console.log(`✅ Processed ${processedCount} accounts, skipped ${skippedCount} accounts with existing summaries`);
        }
        catch (error) {
            console.error("❌ Failed to process existing accounts:", error);
        }
    });
}
function startListener() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = (0, config_1.getConnection)();
            const programId = (0, config_1.getProgramId)();
            console.log("🚀 ========================================");
            console.log("🔍 Starting oracle listener...");
            console.log(`📋 Program ID: ${programId.toBase58()}`);
            console.log(`🌐 RPC: ${connection.rpcEndpoint}`);
            console.log("🚀 ========================================");
            try {
                const latestBlockhash = yield connection.getLatestBlockhash();
                console.log(`✅ Connected to Solana network. Latest slot: ${latestBlockhash.lastValidBlockHeight}`);
            }
            catch (error) {
                console.error("❌ Failed to connect to Solana network:", error);
                process.exit(1);
            }
            yield processExistingAccounts();
            console.log("👂 Setting up account change listener...");
            connection.onProgramAccountChange(programId, (accountInfo, context) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const accountData = accountInfo.accountInfo.data;
                    const accountId = accountInfo.accountId;
                    console.log("\n🎉 ========================================");
                    console.log(`📰 NEW ACCOUNT DETECTED!`);
                    console.log(`🔑 Account ID: ${accountId.toBase58()}`);
                    console.log(`📊 Slot: ${context.slot}`);
                    console.log(`⏰ Time: ${new Date().toISOString()}`);
                    console.log("🎉 ========================================\n");
                    yield (0, article_1.handleNewArticle)(accountId, accountData);
                }
                catch (error) {
                    console.error("❌ Error processing account:", error);
                }
            }), "confirmed");
            console.log("✅ Oracle listener started successfully");
            console.log("🔄 Listening for new news accounts...");
            console.log("💡 Try publishing a news article to see the oracle in action!");
            console.log("🛑 Press Ctrl+C to stop the listener");
            process.on('SIGINT', () => {
                console.log("\n🛑 Shutting down oracle listener...");
                process.exit(0);
            });
        }
        catch (error) {
            console.error("❌ Failed to start oracle listener:", error);
            process.exit(1);
        }
    });
}
startListener().catch(console.error);
//# sourceMappingURL=listener.js.map