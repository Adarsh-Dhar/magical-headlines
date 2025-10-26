-- CreateTable
CREATE TABLE "TrendIndexHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "factors" JSONB NOT NULL,
    "weights" JSONB NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrendIndexHistory_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "price" REAL NOT NULL DEFAULT 0.01,
    "priceChange24h" REAL NOT NULL DEFAULT 0,
    "volume24h" REAL NOT NULL DEFAULT 0,
    "marketCap" REAL NOT NULL DEFAULT 0,
    "storyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marketAccount" TEXT,
    "mintAccount" TEXT,
    "newsAccount" TEXT,
    "stakedTokens" REAL NOT NULL DEFAULT 0,
    "accumulatedFees" REAL NOT NULL DEFAULT 0,
    "trendIndexScore" REAL NOT NULL DEFAULT 0,
    "trendVelocity" REAL NOT NULL DEFAULT 0,
    "sentimentScore" REAL NOT NULL DEFAULT 0,
    "mentionVelocity" REAL NOT NULL DEFAULT 0,
    "holderMomentum" REAL NOT NULL DEFAULT 0,
    "crossMarketCorr" REAL NOT NULL DEFAULT 0,
    "lastTrendUpdate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trendFactorWeights" JSONB,
    CONSTRAINT "Token_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Token" ("accumulatedFees", "createdAt", "id", "marketAccount", "marketCap", "mintAccount", "newsAccount", "price", "priceChange24h", "stakedTokens", "storyId", "volume24h") SELECT "accumulatedFees", "createdAt", "id", "marketAccount", "marketCap", "mintAccount", "newsAccount", "price", "priceChange24h", "stakedTokens", "storyId", "volume24h" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE UNIQUE INDEX "Token_storyId_key" ON "Token"("storyId");
CREATE UNIQUE INDEX "Token_marketAccount_key" ON "Token"("marketAccount");
CREATE UNIQUE INDEX "Token_mintAccount_key" ON "Token"("mintAccount");
CREATE UNIQUE INDEX "Token_newsAccount_key" ON "Token"("newsAccount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TrendIndexHistory_tokenId_timestamp_idx" ON "TrendIndexHistory"("tokenId", "timestamp");
