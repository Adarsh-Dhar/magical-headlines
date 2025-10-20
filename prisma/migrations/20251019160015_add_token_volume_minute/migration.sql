-- CreateTable
CREATE TABLE "TokenVolumeMinute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "minute" DATETIME NOT NULL,
    "volumeSol" REAL NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "buyVolumeSol" REAL NOT NULL DEFAULT 0,
    "sellVolumeSol" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TokenVolumeMinute_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TokenVolumeMinute_tokenId_minute_idx" ON "TokenVolumeMinute"("tokenId", "minute");

-- CreateIndex
CREATE UNIQUE INDEX "TokenVolumeMinute_tokenId_minute_key" ON "TokenVolumeMinute"("tokenId", "minute");
