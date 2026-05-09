/*
  Warnings:

  - The `spotifyTokenExpiresAt` column on the `Session` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "QueueEntry" ADD COLUMN     "spotifyProfile" JSONB;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "hostLastSeenAt" TIMESTAMP(3),
ADD COLUMN     "hostLeftAt" TIMESTAMP(3),
ADD COLUMN     "hostTokenHash" TEXT,
ADD COLUMN     "hostTokenIssuedAt" TIMESTAMP(3),
DROP COLUMN "spotifyTokenExpiresAt",
ADD COLUMN     "spotifyTokenExpiresAt" INTEGER;
