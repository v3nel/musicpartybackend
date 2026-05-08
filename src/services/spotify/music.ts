import { spotifyPlaybackStateType } from "../../types/services/spotify/spotifyPlaybackState";
import { spotifySearchResultsType } from "../../types/services/spotify/spotifySearchResults";
import { Session } from "../prisma/generated/client";
import { refreshTokenIfNeeded } from "./auth";
import { parseSpotifyResponse } from "./parseApi";

export async function searchTracks(search: string, session: Session) {
    const { access_token } = await refreshTokenIfNeeded(session)
    const url = new URL("https://api.spotify.com/v1/search")
    url.searchParams.set("q", search)
    url.searchParams.set("type", "track")
    url.searchParams.set("limit", "10")
    try {
        const request = await fetch(url, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        })
        const response = await parseSpotifyResponse<spotifySearchResultsType>(request)
        return response
    } catch(err) {
        throw new Error("An error occured while communicating with spotify API")
    }
}

export async function addTrackToSpotifyQueue(trackUri: string, session: Session) {
    const { access_token } = await refreshTokenIfNeeded(session)
    const url = new URL("https://api.spotify.com/v1/me/player/queue")
    url.searchParams.set('uri', trackUri)
    try {
        const request = await fetch(url, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        const response = await parseSpotifyResponse<null>(request)
        return response
    } catch(err) {
        throw new Error("An error occured while adding song to Spotify queue")
    }
}

export async function getPlaybackState(session: Session) {
    const { access_token } = await refreshTokenIfNeeded(session)
    const url = new URL("https://api.spotify.com/v1/me/player")
    try {
        const request = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        })
        const response = await parseSpotifyResponse<spotifyPlaybackStateType>(request)
        return response
    } catch(err) {
        throw new Error('An error occured while trying to retrieve host playback state')
    }
}

// TODO: Make a mapPlaybackState function to make it readable by the frontend