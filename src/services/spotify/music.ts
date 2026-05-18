import { spotifyPlaybackStateType } from "../../types/services/spotify/spotifyPlaybackState";
import { spotifySearchResultsType } from "../../types/services/spotify/spotifySearchResults";
import { spotifyTrackItemType } from "../../types/services/spotify/spotifyTrackItem";
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
        throw new Error("An error occured while communicating with spotify API", { cause: err })
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
        throw new Error("An error occured while adding song to Spotify queue", { cause: err })
    }
}

export async function getPlaybackState(session: Session) {
    const { access_token } = await refreshTokenIfNeeded(session)
    const playerUrl = new URL("https://api.spotify.com/v1/me/player")
    const currentlyPlayingUrl = new URL("https://api.spotify.com/v1/me/player/currently-playing")
    const requestPlaybackState = (url: URL) => fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    })
    try {
        try {
            const request = await requestPlaybackState(playerUrl)
            const response = await parseSpotifyResponse<spotifyPlaybackStateType | null>(request)
            if (response) {
                return response
            }
        } catch {
            // Fall back to the lower-scope endpoint when /me/player is unavailable.
        }
        const currentlyPlayingRequest = await requestPlaybackState(currentlyPlayingUrl)
        const response = await parseSpotifyResponse<spotifyPlaybackStateType | null>(currentlyPlayingRequest)
        return response
    } catch(err) {
        throw new Error('An error occured while trying to retrieve host playback state', { cause: err })
    }
}

export function mapPlaybackState(apiResponse: spotifyPlaybackStateType) {
    const isPlaying = apiResponse.is_playing;
    const progressMs = apiResponse.progress_ms;
    const timestamp = Date.now()
    if (!apiResponse.item) {
        return { isPlaying, trackInfos: null, progressMs, timestamp }
    }
    const trackInfos = {
        spotifyTrackId: apiResponse.item.id,
        trackUri: apiResponse.item.uri,
        title: apiResponse.item.name,
        artists: apiResponse.item.artists.map(artist => artist.name),
        cover: apiResponse.item.album.images[0],
        durationMs: apiResponse.item.duration_ms
    }
    return { isPlaying, trackInfos, progressMs, timestamp}
}

export function mapSpotifyTrack(track: spotifyTrackItemType) {
    return { title: track.name, artists: track.artists.map(artists => artists.name), cover: track.album.images[0] }
}

