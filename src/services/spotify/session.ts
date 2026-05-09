import { FetchSpotifyUserProfileType } from "../../types/services/spotify/fetchSpotifyUserProfile";
import prisma from "../db/prisma";
import { secureSpotifyToken } from "./secureToken";

export async function linkSpotifyAccountToSession(sessionId: number, tokens: { access_token: string, refresh_token: string, expires_at: number }, profile: FetchSpotifyUserProfileType) {
    const encryptedAccessToken = await secureSpotifyToken(tokens.access_token)
    const encryptedRefreshToken = await secureSpotifyToken(tokens.refresh_token)
    return prisma.session.update({
        where: { id: Number(sessionId) },
        data: {
            status: "Ready",
            spotifyUserId: profile.id,
            spotifyDisplayName: profile.display_name,
            spotifyAccessTokenEncrypted: encryptedAccessToken,
            spotifyRefreshTokenEncrypted: encryptedRefreshToken,
            spotifyTokenExpiresAt: tokens.expires_at
        }
    })
}
