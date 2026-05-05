import { createQueueEntryType } from "../../types/queueEntry/createQueueEntry";
import prisma from "../db/prisma";

export async function createQueueEntry(data: createQueueEntryType) {
    const session = await prisma.session.findUnique({
        where: { id: Number(data.sessionId) }
    })
    if (!session) {
        throw new Error("Session with that id was not found")
    }
    const guest = await prisma.guest.findUnique({
        where: { id: Number(data.guestId) }
    })
    if (!guest) {
        throw new Error("Guest with that id was not found")
    }
    if (data.fromSpotifyPlaylist === undefined) {
        throw new Error("fromSpotifyPlaylist is required")
    }
    if (!data.status) {
        throw new Error("status is required")
    }
    const create = await prisma.queueEntry.create({
        data: {
            sessionId: Number(data.sessionId),
            guestId: Number(data.guestId),
            fromSpotifyPlaylist: data.fromSpotifyPlaylist,
            status: data.status,
            ...(data.requestedAt !== undefined && {
                requestedAt: data.requestedAt,
            }),
            ...(data.queuedAt !== undefined && {
                queuedAt: data.queuedAt,
            }),
            ...(data.failureReason !== undefined && {
                failureReason: data.failureReason,
            }),
            trackUri: data.trackUri,
            spotifyTrackId: data.spotifyTrackId,
            title: data.title,
            artists: data.artists,
            albumImageUrl: data.albumImageUrl,
            durationMs: data.durationMs
        },
    })
    return create
}