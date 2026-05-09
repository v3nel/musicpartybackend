-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('Spotify_Pending', 'Ready', 'Active', 'Paused', 'Closed');

-- CreateEnum
CREATE TYPE "QueueEntryStatus" AS ENUM ('Pending', 'Queued', 'Rejected', 'Failed');

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "spotifyUserId" TEXT,
    "spotifyDisplayName" TEXT,
    "spotifyAccessTokenEncrypted" TEXT,
    "spotifyRefreshTokenEncrypted" TEXT,
    "spotifyTokenExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '1 hour',
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "guestId" INTEGER NOT NULL,
    "fromSpotifyPlaylist" BOOLEAN NOT NULL,
    "trackUri" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artists" TEXT[],
    "albumImageUrl" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "status" "QueueEntryStatus" NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queuedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
