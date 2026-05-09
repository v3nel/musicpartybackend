import prisma from "../db/prisma";
import { findSessionByCode } from "./find";
import { normalizeSessionSettings } from "./settings";
import { getPlaybackState, mapPlaybackState } from "../spotify/music";

type MappedPlayback = ReturnType<typeof mapPlaybackState>;

const lastPlaybackBySessionId = new Map<number, MappedPlayback>();

function pauseCachedPlayback(sessionId: number) {
	const cached = lastPlaybackBySessionId.get(sessionId);
	if (!cached) return null;
	return {
		...cached,
		isPlaying: false,
		timestamp: Date.now(),
	};
}

export async function getSessionSnapshot(code: string) {
	const session = await findSessionByCode(code);
	if (!session) {
		throw new Error("Session with that code was not found");
	}

	const [guests, initialQueue] = await Promise.all([
		prisma.guest.findMany({
			where: { sessionId: session.id, isHost: false },
			orderBy: { joinedAt: "asc" },
			select: {
				id: true,
				displayName: true,
				isCoHost: true,
				joinedAt: true,
				lastSeenAt: true,
				leftAt: true,
				bannedAt: true,
			},
		}),
		prisma.queueEntry.findMany({
			where: { sessionId: session.id },
			orderBy: { requestedAt: "asc" },
		}),
	]);

	let playback = null;
	if (session.spotifyAccessTokenEncrypted && session.spotifyRefreshTokenEncrypted) {
		try {
			const state = await getPlaybackState(session);
			if (state) {
				playback = mapPlaybackState(state);
				lastPlaybackBySessionId.set(session.id, playback);
			} else {
				playback = pauseCachedPlayback(session.id);
			}
		} catch {
			playback = pauseCachedPlayback(session.id);
		}
	}

	let queue = initialQueue;
	const currentTrackId = playback?.trackInfos?.spotifyTrackId;
	if (currentTrackId) {
		const playing = initialQueue.find(
			(entry) => entry.status === "Queued" && entry.spotifyTrackId === currentTrackId,
		);
		if (playing) {
			await prisma.queueEntry.deleteMany({ where: { id: playing.id } });
			queue = initialQueue.filter((entry) => entry.id !== playing.id);
		}
	}

	return {
		session: {
			id: session.id,
			code: session.code,
			status: session.status,
			spotifyDisplayName: session.spotifyDisplayName,
			settings: normalizeSessionSettings(session.settings),
		},
		guests,
		queue,
		playback,
	};
}
