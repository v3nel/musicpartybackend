import { parseSpotifyResponse } from "./parseApi"
import { FetchSpotifyUserProfileType } from "../../types/services/spotify/fetchSpotifyUserProfile"

export async function fetchSpotifyProfile(access_token: string) {
    const url = new URL("https://api.spotify.com/v1/me")
    try {
        const request = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        })
        const response = await parseSpotifyResponse<FetchSpotifyUserProfileType>(request)
        return response
    } catch(err) {
        throw new Error("An error occured while communicating with Spotify API")
    }
}