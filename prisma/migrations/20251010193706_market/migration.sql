-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Story" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "headline" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "arweaveUrl" TEXT NOT NULL,
    "arweaveId" TEXT NOT NULL,
    "onchainSignature" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "onMarket" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Story_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Story" ("arweaveId", "arweaveUrl", "content", "createdAt", "headline", "id", "onchainSignature", "originalUrl", "submitterId", "updatedAt") SELECT "arweaveId", "arweaveUrl", "content", "createdAt", "headline", "id", "onchainSignature", "originalUrl", "submitterId", "updatedAt" FROM "Story";
DROP TABLE "Story";
ALTER TABLE "new_Story" RENAME TO "Story";
CREATE UNIQUE INDEX "Story_originalUrl_key" ON "Story"("originalUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
