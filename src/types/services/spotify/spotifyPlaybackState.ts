import { spotifyTrackItemType } from "./spotifyTrackItem"

export type spotifyPlaybackStateType = {
    device: {
        id: string,
        is_active: boolean,
        is_private_session: boolean,
        is_restricted: boolean,
        name: string,
        type: string,
        volume_percent: number,
        supports_volume: boolean
    },
    repeat_state: string,
    shuffle_state: boolean,
    context: {
        type: string,
        href: string,
        external_urls: {
        spotify: string
        },
        uri: string
    },
    timestamp: 0,
    progress_ms: 0,
    is_playing: boolean,
    item: spotifyTrackItemType,
    currently_playing_type: string,
    actions: {
        interrupting_playback: boolean,
        pausing: boolean,
        resuming: boolean,
        seeking: boolean,
        skipping_next: boolean,
        skipping_prev: boolean,
        toggling_repeat_context: boolean,
        toggling_shuffle: boolean,
        toggling_repeat_track: boolean,
        transferring_playback: boolean
    }
}