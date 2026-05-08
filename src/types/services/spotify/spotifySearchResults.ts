import { spotifyTrackItemType } from "./spotifyTrackItem"

export type spotifySearchResultsType = {
    tracks: {
        href: string,
        limit: number,
        next?: string,
        offset: number,
        previous?: string,
        total: number,
        items: spotifyTrackItemType[]
    }
}