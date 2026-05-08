import { FetchSpotifyUserProfileType } from "../../types/services/spotify/fetchSpotifyUserProfile";

export async function linkSpotifyAccountToSession(sessionId: number, tokens: { access_token: string, refresh_token: string, expires_at: number }, profile: FetchSpotifyUserProfileType) {
    
}