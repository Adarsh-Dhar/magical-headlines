/*
  Warnings:

  - A unique constraint covering the columns `[marketAccount]` on the table `Token` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mintAccount]` on the table `Token` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[newsAccount]` on the table `Token` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Token" ADD COLUMN "marketAccount" TEXT;
ALTER TABLE "Token" ADD COLUMN "mintAccount" TEXT;
ALTER TABLE "Token" ADD COLUMN "newsAccount" TEXT;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAddress" TEXT NOT NULL,
    "onchainAddress" TEXT,
    "totalPnl" REAL NOT NULL DEFAULT 0,
    "totalVolume" REAL NOT NULL DEFAULT 0,
    "tradesCount" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "trophies" INTEGER NOT NULL DEFAULT 0,
    "currentSeasonPnl" REAL NOT NULL DEFAULT 0,
    "lastTradeTimestamp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" INTEGER NOT NULL,
    "onchainAddress" TEXT,
    "startTimestamp" DATETIME NOT NULL,
    "endTimestamp" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeasonStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "pnl" REAL NOT NULL DEFAULT 0,
    "volume" REAL NOT NULL DEFAULT 0,
    "tradesCount" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "trophyTier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeasonStats_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SeasonStats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradePosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAddress" TEXT NOT NULL,
    "marketAddress" TEXT NOT NULL,
    "onchainAddress" TEXT,
    "totalBought" REAL NOT NULL DEFAULT 0,
    "totalSold" REAL NOT NULL DEFAULT 0,
    "avgBuyPrice" REAL NOT NULL DEFAULT 0,
    "realizedPnl" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradePosition_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "Profile" ("userAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userAddress_key" ON "Profile"("userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_onchainAddress_key" ON "Profile"("onchainAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Season_seasonId_key" ON "Season"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_onchainAddress_key" ON "Season"("onchainAddress");

-- CreateIndex
CREATE INDEX "SeasonStats_seasonId_pnl_idx" ON "SeasonStats"("seasonId", "pnl");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonStats_profileId_seasonId_key" ON "SeasonStats"("profileId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "TradePosition_onchainAddress_key" ON "TradePosition"("onchainAddress");

-- CreateIndex
CREATE INDEX "TradePosition_userAddress_idx" ON "TradePosition"("userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "TradePosition_userAddress_marketAddress_key" ON "TradePosition"("userAddress", "marketAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Token_marketAccount_key" ON "Token"("marketAccount");

-- CreateIndex
CREATE UNIQUE INDEX "Token_mintAccount_key" ON "Token"("mintAccount");

-- CreateIndex
CREATE UNIQUE INDEX "Token_newsAccount_key" ON "Token"("newsAccount");
