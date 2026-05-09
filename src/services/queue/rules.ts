import prisma from "../db/prisma";
import { normalizeSessionSettings } from "../session/settings";

export type QueueTrackInput = {
	trackUri: string;
	spotifyTrackId: string;
	title: string;
	artists: string[];
	albumImageUrl: string;
	durationMs: number;
};

export async function validateQueueRequest(sessionId: number, guestId: number, track: QueueTrackInput) {
	const [session, guest] = await Promise.all([
		prisma.session.findUnique({ where: { id: Number(sessionId) } }),
		prisma.guest.findUnique({ where: { id: Number(guestId) } }),
	]);

	if (!session) {
		throw new Error("Session with that id was not found");
	}
	if (!guest || guest.sessionId !== session.id) {
		throw new Error("Guest with that id was not found");
	}
	if (guest.bannedAt) {
		throw new Error("This guest is banned from the session");
	}
	if (["Closed", "Spotify_Pending"].includes(session.status)) {
		throw new Error("Session is not ready for queue updates");
	}
	if (!track.trackUri || !track.spotifyTrackId || !track.title || !Array.isArray(track.artists)) {
		throw new Error("Track payload is incomplete");
	}

	const settings = normalizeSessionSettings(session.settings);

	if (!settings.allowDuplicates) {
		const duplicate = await prisma.queueEntry.findFirst({
			where: {
				sessionId: session.id,
				spotifyTrackId: track.spotifyTrackId,
				status: { in: ["Pending", "Queued"] },
			},
		});
		if (duplicate) {
			throw new Error("This track is already in the queue");
		}
	}

	if (!guest.isHost && settings.maxTracksPerGuest > 0) {
		const count = await prisma.queueEntry.count({
			where: {
				sessionId: session.id,
				guestId: guest.id,
				status: { in: ["Pending", "Queued"] },
			},
		});
		if (count >= settings.maxTracksPerGuest) {
			throw new Error("This guest reached the queue limit");
		}
	}

	if (!guest.isHost && settings.cooldownSeconds > 0) {
		const latest = await prisma.queueEntry.findFirst({
			where: { sessionId: session.id, guestId: guest.id },
			orderBy: { requestedAt: "desc" },
		});
		if (latest) {
			const nextAllowedAt = latest.requestedAt.getTime() + settings.cooldownSeconds * 1000;
			if (Date.now() < nextAllowedAt) {
				throw new Error("Please wait before adding another track");
			}
		}
	}

	return { session, guest, settings };
}
