export type createQueueEntryType = {
    id?: number,
    sessionId: number,
    guestId: number,
    fromSpotifyPlaylist: boolean,
    trackUri: string,
    spotifyTrackId: string,
    title: string,
    artists: string[],
    albumImageUrl: string,
    durationMs: number,
    status: "Pending" | "Queued" | "Rejected" | "Failed",
    requestedAt?: Date,
    queuedAt?: Date,
    failureReason?: string
}