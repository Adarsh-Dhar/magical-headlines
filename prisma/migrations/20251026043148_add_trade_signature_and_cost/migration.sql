/*
  Warnings:

  - Added the required column `costInSol` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "priceAtTrade" REAL NOT NULL,
    "costInSol" REAL NOT NULL,
    "signature" TEXT,
    "traderId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("amount", "id", "priceAtTrade", "timestamp", "tokenId", "traderId", "type") SELECT "amount", "id", "priceAtTrade", "timestamp", "tokenId", "traderId", "type" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE INDEX "Trade_traderId_timestamp_idx" ON "Trade"("traderId", "timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
