import express, { Request, Response } from "express";
import { isCodeAvailable, findSessionByCode } from "../services/session/find";
import { createSession } from "../services/session/create";
import { getSessionForHostReconnect } from "../services/session/host";
import { updateSessionSettings } from "../services/session/update";
import { getSessionSnapshot } from "../services/session/snapshot";
import { normalizeSessionSettings } from "../services/session/settings";
import { createGuest } from "../services/guest/create";
import { createGuestToken } from "../services/guest/token";
import { findGuestByToken } from "../services/guest/find";
import { banGuest } from "../services/guest/update";
import { createQueueEntry } from "../services/queue/create";
import { listQueueBySession } from "../services/queue/find";
import { validateQueueRequest } from "../services/queue/rules";
import { markQueueEntryQueued, markQueueEntryRejected, markQueueEntryFailed, removeQueueEntry } from "../services/queue/update";
import { addTrackToSpotifyQueue, searchTracks } from "../services/spotify/music";
import { getPlaybackState, mapPlaybackState } from "../services/spotify/music";
import { broadcastSessionSnapshot } from "../services/realtime";

const sessionRouter = express.Router();

function tokenFromRequest(req: Request) {
	const auth = req.headers.authorization;
	if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length);
	const raw = req.headers["x-session-token"];
	return typeof raw === "string" ? raw : "";
}

function codeParam(req: Request) {
	const value = req.params.code;
	return Array.isArray(value) ? value[0] : value;
}

async function getSessionOr404(code: string, res: Response) {
	const session = await findSessionByCode(code);
	if (!session) {
		res.status(404).json({ code: 404, error: "Session with that code was not found" });
		return null;
	}
	return session;
}

function toHttpError(err: unknown) {
	const message = err instanceof Error ? err.message : "Internal Server Error";
	if (message.includes("not found")) return { status: 404, message };
	if (message.includes("Invalid") || message.includes("token") || message.includes("banned")) return { status: 401, message };
	if (message.includes("already") || message.includes("limit") || message.includes("wait") || message.includes("not ready")) return { status: 409, message };
	return { status: 500, message: "Internal Server Error" };
}

sessionRouter.get("/iscodeavailable", async (req: Request, res: Response) => {
	const code = req.query.code;
	if (!code || typeof code !== "string") {
		return res.status(400).json({ code: 400, error: "No code was submitted for checking" });
	}
	try {
		return res.status(200).send(await isCodeAvailable(code));
	} catch {
		return res.status(500).json({ code: 500, error: "Internal server error" });
	}
});

sessionRouter.post("/reserve-code", async (req: Request, res: Response) => {
	const { code, settings } = req.body;
	if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
		return res.status(400).json({ code: 400, error: "A 6-digit code is required" });
	}
	try {
		const reserve = await createSession({ code, settings: normalizeSessionSettings(settings) });
		return res.status(201).json({
			session: {
				id: reserve.session.id,
				code: reserve.session.code,
				status: reserve.session.status,
				settings: normalizeSessionSettings(reserve.session.settings),
			},
			hostToken: reserve.hostToken,
		});
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.get("/:code", async (req: Request, res: Response) => {
	try {
		return res.status(200).json(await getSessionSnapshot(codeParam(req)));
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.post("/:code/join", async (req: Request, res: Response) => {
	const displayName = typeof req.body.displayName === "string" ? req.body.displayName.trim() : "";
	if (displayName.length < 1 || displayName.length > 32) {
		return res.status(400).json({ code: 400, error: "Display name must be 1 to 32 characters" });
	}
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		const guestToken = createGuestToken();
		const guest = await createGuest(session.id, displayName, guestToken.tokenHash);
		await broadcastSessionSnapshot(session.code, "guests.updated");
		return res.status(201).json({ guest, guestToken: guestToken.token });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.post("/:code/guest/reconnect", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		const guest = await findGuestByToken(tokenFromRequest(req));
		if (!guest || guest.sessionId !== session.id || guest.bannedAt) {
			return res.status(401).json({ code: 401, error: "Invalid guest token" });
		}
		return res.status(200).json({ guest });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.post("/:code/host/reconnect", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		const host = await getSessionForHostReconnect(session.id, tokenFromRequest(req));
		return res.status(200).json({ session: host });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.get("/:code/search", async (req: Request, res: Response) => {
	const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
	if (!q) return res.status(200).json({ tracks: [] });
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		const result = await searchTracks(q, session);
		const tracks = result.tracks.items.map((track) => ({
			trackUri: track.uri,
			spotifyTrackId: track.id,
			title: track.name,
			artists: track.artists.map((artist) => artist.name),
			albumImageUrl: track.album.images[0]?.url ?? "",
			durationMs: track.duration_ms,
		}));
		return res.status(200).json({ tracks });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.get("/:code/queue", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		const queue = await listQueueBySession(session.id);
		return res.status(200).json({ queue });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.get("/:code/playback", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		if (!session.spotifyAccessTokenEncrypted || !session.spotifyRefreshTokenEncrypted) {
			return res.status(200).json({ playback: null });
		}
		const state = await getPlaybackState(session);
		return res.status(200).json({ playback: state ? mapPlaybackState(state) : null });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.post("/:code/queue", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		const guest = await findGuestByToken(tokenFromRequest(req));
		if (!guest || guest.sessionId !== session.id) {
			return res.status(401).json({ code: 401, error: "Invalid guest token" });
		}
		const { settings } = await validateQueueRequest(session.id, guest.id, req.body);
		const entry = await createQueueEntry({
			sessionId: session.id,
			guestId: guest.id,
			fromSpotifyPlaylist: false,
			trackUri: req.body.trackUri,
			spotifyTrackId: req.body.spotifyTrackId,
			title: req.body.title,
			artists: req.body.artists,
			albumImageUrl: req.body.albumImageUrl ?? "",
			durationMs: Number(req.body.durationMs),
			status: "Pending",
		});
		let finalEntry = entry;
		if (settings.autoApprove) {
			try {
				await addTrackToSpotifyQueue(req.body.trackUri, session);
				finalEntry = await markQueueEntryQueued(entry.id);
			} catch (err) {
				finalEntry = await markQueueEntryQueued(entry.id);
			}
		}
		await broadcastSessionSnapshot(session.code, "queue.updated");
		const queue = await listQueueBySession(session.id);
		return res.status(201).json({ entry: finalEntry, queue });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.patch("/:code/settings", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		await getSessionForHostReconnect(session.id, tokenFromRequest(req));
		const updated = await updateSessionSettings(session.id, normalizeSessionSettings(req.body));
		await broadcastSessionSnapshot(session.code, "settings.updated");
		return res.status(200).json({ settings: normalizeSessionSettings(updated.settings) });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.post("/:code/queue/:entryId/:action", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		await getSessionForHostReconnect(session.id, tokenFromRequest(req));
		const entryId = Number(req.params.entryId);
		if (req.params.action === "approve") {
			const entry = await markQueueEntryQueued(entryId);
			await addTrackToSpotifyQueue(entry.trackUri, session);
		} else if (req.params.action === "reject") {
			await markQueueEntryRejected(entryId);
		} else if (req.params.action === "remove") {
			await removeQueueEntry(entryId);
		} else {
			return res.status(404).json({ code: 404, error: "Unknown queue action" });
		}
		await broadcastSessionSnapshot(session.code, "queueEntry.updated");
		return res.status(200).json({ ok: true });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

sessionRouter.post("/:code/guests/:guestId/ban", async (req: Request, res: Response) => {
	try {
		const session = await getSessionOr404(codeParam(req), res);
		if (!session) return;
		await getSessionForHostReconnect(session.id, tokenFromRequest(req));
		const guest = await banGuest(Number(req.params.guestId));
		await broadcastSessionSnapshot(session.code, "guests.updated");
		return res.status(200).json({ guest });
	} catch (err) {
		const http = toHttpError(err);
		return res.status(http.status).json({ code: http.status, error: http.message });
	}
});

export default sessionRouter;
