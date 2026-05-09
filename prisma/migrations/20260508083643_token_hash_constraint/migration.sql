/*
  Warnings:

  - A unique constraint covering the columns `[tokenHash]` on the table `Guest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "QueueEntry" ALTER COLUMN "fromSpotifyPlaylist" SET DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "spotifyTokenExpiresAt" SET DEFAULT now() + interval '1 hour';

-- CreateIndex
CREATE UNIQUE INDEX "Guest_tokenHash_key" ON "Guest"("tokenHash");
