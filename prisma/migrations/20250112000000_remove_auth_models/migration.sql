-- DropForeignKey
DROP TABLE IF EXISTS "Account";

-- DropForeignKey
DROP TABLE IF EXISTS "Session";

-- DropForeignKey
DROP TABLE IF EXISTS "VerificationToken";

-- DropIndex
DROP INDEX IF EXISTS "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" DROP COLUMN "emailVerified";
ALTER TABLE "User" DROP COLUMN "image";
