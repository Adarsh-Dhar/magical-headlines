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
exports.handleNewArticle = handleNewArticle;
const generative_ai_1 = require("@google/generative-ai");
const anchor = __importStar(require("@coral-xyz/anchor"));
const news_platform_json_1 = __importDefault(require("../../contract/target/idl/news_platform.json"));
const onchain_1 = require("./onchain");
const config_1 = require("./config");
const node_fetch_1 = __importDefault(require("node-fetch"));
const PROGRAM_ID = process.env.PROGRAM_ID;
const connection = (0, config_1.getConnection)();
function uploadToArweave(data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const baseUrl = (_a = process.env.ARWEAVE_UPLOAD_URL) !== null && _a !== void 0 ? _a : "http://localhost:3000";
        const fetchPromise = (() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const res = yield (0, node_fetch_1.default)(`${baseUrl}/api/arweave/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: data,
                    tags: [
                        { name: "Content-Type", value: "text/plain" },
                        { name: "Summary-For", value: "news-article" },
                        { name: "App-Name", value: "TradeTheNews" },
                    ],
                }),
            });
            if (!res.ok) {
                const text = yield res.text().catch(() => "");
                throw new Error(`Arweave upload failed ${res.status}: ${text}`);
            }
            const json = yield res.json();
            if (!json.success || !json.url)
                throw new Error((_a = json.error) !== null && _a !== void 0 ? _a : "Arweave upload returned no URL");
            return json.url;
        }))();
        const timeoutPromise = new Promise((_, reject) => {
            const id = setTimeout(() => {
                clearTimeout(id);
                reject(new Error("Arweave upload timed out"));
            }, 20000);
        });
        return Promise.race([fetchPromise, timeoutPromise]);
    });
}
function handleNewArticle(accountId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
        const provider = new anchor.AnchorProvider(connection, wallet, {});
        const program = new anchor.Program(news_platform_json_1.default, provider);
        const newsAccount = yield program.coder.accounts.decode("newsAccount", data);
        console.log(`Processing article: ${newsAccount.headline}`);
        const articleResponse = yield (0, node_fetch_1.default)(newsAccount.arweaveLink);
        const articleContent = yield articleResponse.text();
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = [
            "You are a helpful assistant that summarizes news articles.",
            "Please produce a concise 3-5 sentence summary with key facts and neutral tone.",
            "Article:",
            articleContent
        ].join("\n\n");
        const summaryResponse = yield model.generateContent(prompt);
        const summary = summaryResponse.response.text();
        if (!summary) {
            console.error("Failed to generate summary.");
            return;
        }
        const summaryLink = yield uploadToArweave(summary);
        console.log(`Generated summary and uploaded to: ${summaryLink}`);
        yield (0, onchain_1.updateOnChainSummary)(accountId, summaryLink);
    });
}
//# sourceMappingURL=article.js.map