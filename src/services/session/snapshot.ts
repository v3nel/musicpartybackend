import prisma from "../db/prisma";
import { findSessionByCode } from "./find";
import { normalizeSessionSettings } from "./settings";
import { getPlaybackState, mapPlaybackState } from "../spotify/music";

export async function getSessionSnapshot(code: string) {
	const session = await findSessionByCode(code);
	if (!session) {
		throw new Error("Session with that code was not found");
	}

	const [guests, queue] = await Promise.all([
		prisma.guest.findMany({
			where: { sessionId: session.id },
			orderBy: { joinedAt: "asc" },
			select: {
				id: true,
				displayName: true,
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
			playback = state ? mapPlaybackState(state) : null;
		} catch {
			playback = null;
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
