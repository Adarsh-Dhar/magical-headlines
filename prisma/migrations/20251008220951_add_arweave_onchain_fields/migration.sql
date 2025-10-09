/*
  Warnings:

  - Added the required column `arweaveId` to the `Story` table without a default value. This is not possible if the table is not empty.
  - Added the required column `arweaveUrl` to the `Story` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `Story` table without a default value. This is not possible if the table is not empty.
  - Added the required column `onchainSignature` to the `Story` table without a default value. This is not possible if the table is not empty.

*/
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Story_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Story" ("createdAt", "headline", "content", "id", "originalUrl", "arweaveUrl", "arweaveId", "onchainSignature", "submitterId", "updatedAt") SELECT "createdAt", "headline", "No content available", "id", "originalUrl", "https://arweave.net/placeholder", "placeholder", "placeholder", "submitterId", "updatedAt" FROM "Story";
DROP TABLE "Story";
ALTER TABLE "new_Story" RENAME TO "Story";
CREATE UNIQUE INDEX "Story_originalUrl_key" ON "Story"("originalUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
