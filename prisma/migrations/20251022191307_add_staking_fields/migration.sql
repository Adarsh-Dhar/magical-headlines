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
    CONSTRAINT "Token_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Token" ("createdAt", "id", "marketAccount", "marketCap", "mintAccount", "newsAccount", "price", "priceChange24h", "storyId", "volume24h") SELECT "createdAt", "id", "marketAccount", "marketCap", "mintAccount", "newsAccount", "price", "priceChange24h", "storyId", "volume24h" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE UNIQUE INDEX "Token_storyId_key" ON "Token"("storyId");
CREATE UNIQUE INDEX "Token_marketAccount_key" ON "Token"("marketAccount");
CREATE UNIQUE INDEX "Token_mintAccount_key" ON "Token"("mintAccount");
CREATE UNIQUE INDEX "Token_newsAccount_key" ON "Token"("newsAccount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
