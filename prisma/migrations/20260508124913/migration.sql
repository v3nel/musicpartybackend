-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "spotifyTokenExpiresAt" SET DEFAULT now() + interval '1 hour',
ALTER COLUMN "settings" DROP NOT NULL;
