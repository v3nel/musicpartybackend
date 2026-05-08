export type spotifyTrackItemType = {
    album: {
        album_type: string,
        artists: {
            external_urls: {
                spotify: string
            },
            href: string,
            id: string,
            name: string,
            type: string,
            uri: string
        }[],
        available_markets: string[],
        external_urls: {
            spotify: string
        },
        href: string,
        id: string,
        images: {
            height: number,
            width: number,
            url: string
        }[],
        is_playable: boolean,
        name: string,
        release_date: string,
        release_date_precision: string,
        total_tracks: number,
        type: string,
        uri: string
    },
    artists: {
        external_urls: {
            spotify: string
        },
        href: string,
        id: string,
        name: string,
        type: string,
        uri: string
    }[],
    available_markets: string[]
    disc_number: number,
    duration_ms: number,
    explicit: boolean,
    external_ids: {
        isrc: string
    },
    external_urls: {
        spotify: string
    },
    href: string,
    id: string,
    is_local: false,
    is_playable: true,
    name: string,
    popularity: 51,
    preview_url?: string,
    track_number: 1,
    type: string,
    uri: string
}