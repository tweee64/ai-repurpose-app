/*
  Warnings:

  - You are about to drop the column `bufferAccessToken` on the `ConnectedAccount` table. All the data in the column will be lost.
  - You are about to drop the column `bufferProfileId` on the `ConnectedAccount` table. All the data in the column will be lost.
  - Added the required column `accessToken` to the `ConnectedAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConnectedAccount" DROP COLUMN "bufferAccessToken",
DROP COLUMN "bufferProfileId",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);
