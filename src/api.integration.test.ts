import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

const session = {
	id: 7,
	code: "123456",
	status: "Ready",
	settings: {
		autoApprove: true,
		allowDuplicates: true,
		maxTracksPerGuest: 10,
		cooldownSeconds: 0,
	},
};

const queueEntry = {
	id: 3,
	sessionId: 7,
	guestId: 2,
	trackUri: "spotify:track:abc",
	spotifyTrackId: "abc",
	title: "Song",
	artists: ["Artist"],
	albumImageUrl: "https://example.com/cover.jpg",
	durationMs: 123000,
	status: "Queued",
	requestedAt: new Date("2026-05-09T10:00:00.000Z"),
};

const guest = {
	id: 2,
	sessionId: 7,
	displayName: "Alice",
	tokenHash: "hashed-token",
	joinedAt: new Date("2026-05-09T10:00:00.000Z"),
	lastSeenAt: null,
	leftAt: null,
	bannedAt: null,
};

const snapshot = {
	session,
	guests: [guest],
	queue: [queueEntry],
	playback: null,
};

const mocks = {
	isCodeAvailable: jest.fn(),
	findSessionByCode: jest.fn(),
	createSession: jest.fn(),
	getSessionForHostReconnect: jest.fn(),
	updateSessionSettings: jest.fn(),
	getSessionSnapshot: jest.fn(),
	createGuest: jest.fn(),
	createGuestToken: jest.fn(),
	findGuestByToken: jest.fn(),
	banGuest: jest.fn(),
	createQueueEntry: jest.fn(),
	listQueueBySession: jest.fn(),
	validateQueueRequest: jest.fn(),
	markQueueEntryQueued: jest.fn(),
	markQueueEntryRejected: jest.fn(),
	markQueueEntryFailed: jest.fn(),
	removeQueueEntry: jest.fn(),
	addTrackToSpotifyQueue: jest.fn(),
	getPlaybackState: jest.fn(),
	mapPlaybackState: jest.fn(),
	searchTracks: jest.fn(),
	broadcastSessionSnapshot: jest.fn(),
	buildSpotifyAuthURL: jest.fn(),
	decryptOAuthState: jest.fn(),
	exchangeCodeforToken: jest.fn(),
	fetchSpotifyProfile: jest.fn(),
	linkSpotifyAccountToSession: jest.fn(),
};

jest.unstable_mockModule("./services/session/find", () => ({
	isCodeAvailable: mocks.isCodeAvailable,
	findSessionByCode: mocks.findSessionByCode,
}));

jest.unstable_mockModule("./services/session/create", () => ({
	createSession: mocks.createSession,
}));

jest.unstable_mockModule("./services/session/host", () => ({
	getSessionForHostReconnect: mocks.getSessionForHostReconnect,
}));

jest.unstable_mockModule("./services/session/update", () => ({
	updateSessionSettings: mocks.updateSessionSettings,
}));

jest.unstable_mockModule("./services/session/snapshot", () => ({
	getSessionSnapshot: mocks.getSessionSnapshot,
}));

jest.unstable_mockModule("./services/guest/create", () => ({
	createGuest: mocks.createGuest,
}));

jest.unstable_mockModule("./services/guest/token", () => ({
	createGuestToken: mocks.createGuestToken,
	hashGuestToken: jest.fn((token: string) => `hashed-${token}`),
}));

jest.unstable_mockModule("./services/guest/find", () => ({
	findGuestByToken: mocks.findGuestByToken,
}));

jest.unstable_mockModule("./services/guest/update", () => ({
	banGuest: mocks.banGuest,
}));

jest.unstable_mockModule("./services/queue/create", () => ({
	createQueueEntry: mocks.createQueueEntry,
}));

jest.unstable_mockModule("./services/queue/find", () => ({
	listQueueBySession: mocks.listQueueBySession,
	findQueueEntryById: jest.fn(),
}));

jest.unstable_mockModule("./services/queue/rules", () => ({
	validateQueueRequest: mocks.validateQueueRequest,
}));

jest.unstable_mockModule("./services/queue/update", () => ({
	markQueueEntryQueued: mocks.markQueueEntryQueued,
	markQueueEntryRejected: mocks.markQueueEntryRejected,
	markQueueEntryFailed: mocks.markQueueEntryFailed,
	removeQueueEntry: mocks.removeQueueEntry,
}));

jest.unstable_mockModule("./services/spotify/music", () => ({
	addTrackToSpotifyQueue: mocks.addTrackToSpotifyQueue,
	getPlaybackState: mocks.getPlaybackState,
	mapPlaybackState: mocks.mapPlaybackState,
	searchTracks: mocks.searchTracks,
}));

jest.unstable_mockModule("./services/realtime", () => ({
	broadcastSessionSnapshot: mocks.broadcastSessionSnapshot,
}));

jest.unstable_mockModule("./services/spotify/auth", () => ({
	buildSpotifyAuthURL: mocks.buildSpotifyAuthURL,
	decryptOAuthState: mocks.decryptOAuthState,
	exchangeCodeforToken: mocks.exchangeCodeforToken,
}));

jest.unstable_mockModule("./services/spotify/user", () => ({
	fetchSpotifyProfile: mocks.fetchSpotifyProfile,
}));

jest.unstable_mockModule("./services/spotify/session", () => ({
	linkSpotifyAccountToSession: mocks.linkSpotifyAccountToSession,
}));

const { createApp } = await import("./app");

function listen(app: Express) {
	const server = http.createServer(app);
	return new Promise<{ server: http.Server; baseUrl: string }>((resolve) => {
		server.listen(0, () => {
			const address = server.address() as AddressInfo;
			resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
		});
	});
}

async function json(response: Response) {
	return response.json() as Promise<Record<string, unknown>>;
}

describe("API routes integration", () => {
	let server: http.Server;
	let baseUrl: string;

	beforeAll(async () => {
		const started = await listen(createApp());
		server = started.server;
		baseUrl = started.baseUrl;
	});

	afterAll(async () => {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => error ? reject(error) : resolve());
		});
	});

	beforeEach(() => {
		for (const mock of Object.values(mocks)) {
			mock.mockReset();
		}
		process.env.FRONTEND_URL = "http://localhost:3000";
		mocks.isCodeAvailable.mockResolvedValue(true as never);
		mocks.findSessionByCode.mockResolvedValue(session as never);
		mocks.createSession.mockResolvedValue({ session, hostToken: "host-token" } as never);
		mocks.getSessionForHostReconnect.mockResolvedValue(session as never);
		mocks.updateSessionSettings.mockResolvedValue({ ...session, settings: session.settings } as never);
		mocks.getSessionSnapshot.mockResolvedValue(snapshot as never);
		mocks.createGuest.mockResolvedValue(guest as never);
		mocks.createGuestToken.mockReturnValue({ token: "guest-token", tokenHash: "guest-token-hash" } as never);
		mocks.findGuestByToken.mockResolvedValue(guest as never);
		mocks.banGuest.mockResolvedValue({ ...guest, bannedAt: new Date("2026-05-09T11:00:00.000Z") } as never);
		mocks.validateQueueRequest.mockResolvedValue({ session, guest, settings: session.settings } as never);
		mocks.createQueueEntry.mockResolvedValue(queueEntry as never);
		mocks.listQueueBySession.mockResolvedValue([queueEntry] as never);
		mocks.markQueueEntryQueued.mockResolvedValue(queueEntry as never);
		mocks.markQueueEntryRejected.mockResolvedValue({ ...queueEntry, status: "Rejected" } as never);
		mocks.markQueueEntryFailed.mockResolvedValue({ ...queueEntry, status: "Failed" } as never);
		mocks.removeQueueEntry.mockResolvedValue(queueEntry as never);
		mocks.broadcastSessionSnapshot.mockResolvedValue(snapshot as never);
		mocks.getPlaybackState.mockResolvedValue({
			is_playing: true,
			progress_ms: 12_000,
			timestamp: 1_700_000_000_000,
			item: {
				name: "Playing Song",
				artists: [{ name: "Artist" }],
				album: { images: [{ url: "https://example.com/playing.jpg" }] },
			},
		} as never);
		mocks.mapPlaybackState.mockReturnValue({
			isPlaying: true,
			progressMs: 12_000,
			timestamp: 1_700_000_000_000,
			trackInfos: {
				title: "Playing Song",
				artists: ["Artist"],
				cover: { url: "https://example.com/playing.jpg" },
			},
		} as never);
		mocks.searchTracks.mockResolvedValue({
			tracks: {
				items: [{
					uri: "spotify:track:abc",
					id: "abc",
					name: "Song",
					artists: [{ name: "Artist" }],
					album: { images: [{ url: "https://example.com/cover.jpg" }] },
					duration_ms: 123000,
				}],
			},
		} as never);
		mocks.buildSpotifyAuthURL.mockResolvedValue(new URL("https://accounts.spotify.com/authorize?state=state") as never);
		mocks.decryptOAuthState.mockResolvedValue({ sessionId: 7 } as never);
		mocks.exchangeCodeforToken.mockResolvedValue({
			access_token: "access",
			refresh_token: "refresh",
			expires_in: 3600,
		} as never);
		mocks.fetchSpotifyProfile.mockResolvedValue({ id: "spotify-user", display_name: "Host" } as never);
		mocks.linkSpotifyAccountToSession.mockResolvedValue(session as never);
	});

	it("GET /health returns health status", async () => {
		const response = await fetch(`${baseUrl}/health`);
		const body = await json(response);
		expect(response.status).toBe(200);
		expect(body.status).toBe("ok");
		expect(typeof body.timestamp).toBe("string");
	});

	it("OPTIONS preflight returns CORS headers", async () => {
		const response = await fetch(`${baseUrl}/session/123456`, { method: "OPTIONS" });
		expect(response.status).toBe(204);
		expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
	});

	it("GET /session/iscodeavailable checks code availability", async () => {
		const response = await fetch(`${baseUrl}/session/iscodeavailable?code=123456`);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("true");
		expect(mocks.isCodeAvailable).toHaveBeenCalledWith("123456");
	});

	it("POST /session/reserve-code creates a session with settings", async () => {
		const response = await fetch(`${baseUrl}/session/reserve-code`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code: "123456", settings: session.settings }),
		});
		const body = await json(response);
		expect(response.status).toBe(201);
		expect(body.hostToken).toBe("host-token");
		expect(mocks.createSession).toHaveBeenCalledWith({ code: "123456", settings: session.settings });
	});

	it("GET /session/:code returns a session snapshot", async () => {
		const response = await fetch(`${baseUrl}/session/123456`);
		const body = await json(response);
		expect(response.status).toBe(200);
		expect(body.session).toMatchObject({ id: 7, code: "123456" });
		expect(mocks.getSessionSnapshot).toHaveBeenCalledWith("123456");
	});

	it("POST /session/:code/join creates a guest and token", async () => {
		const response = await fetch(`${baseUrl}/session/123456/join`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "Alice" }),
		});
		const body = await json(response);
		expect(response.status).toBe(201);
		expect(body.guestToken).toBe("guest-token");
		expect(mocks.createGuest).toHaveBeenCalledWith(7, "Alice", "guest-token-hash");
		expect(mocks.broadcastSessionSnapshot).toHaveBeenCalledWith("123456", "guests.updated");
	});

	it("POST /session/:code/guest/reconnect validates guest token", async () => {
		const response = await fetch(`${baseUrl}/session/123456/guest/reconnect`, {
			method: "POST",
			headers: { Authorization: "Bearer guest-token" },
		});
		const body = await json(response);
		expect(response.status).toBe(200);
		expect(body.guest).toMatchObject({ id: 2 });
		expect(mocks.findGuestByToken).toHaveBeenCalledWith("guest-token");
	});

	it("POST /session/:code/host/reconnect validates host token", async () => {
		const response = await fetch(`${baseUrl}/session/123456/host/reconnect`, {
			method: "POST",
			headers: { Authorization: "Bearer host-token" },
		});
		expect(response.status).toBe(200);
		expect(mocks.getSessionForHostReconnect).toHaveBeenCalledWith(7, "host-token");
	});

	it("GET /session/:code/search maps Spotify tracks", async () => {
		const response = await fetch(`${baseUrl}/session/123456/search?q=Song`);
		const body = await json(response);
		expect(response.status).toBe(200);
		expect(body.tracks).toEqual([{
			trackUri: "spotify:track:abc",
			spotifyTrackId: "abc",
			title: "Song",
			artists: ["Artist"],
			albumImageUrl: "https://example.com/cover.jpg",
			durationMs: 123000,
		}]);
		expect(mocks.searchTracks).toHaveBeenCalledWith("Song", session);
	});

	it("GET /session/:code/queue returns the session queue", async () => {
		const response = await fetch(`${baseUrl}/session/123456/queue`);
		const body = await json(response);
		expect(response.status).toBe(200);
		expect(body.queue).toEqual(expect.arrayContaining([
			expect.objectContaining({ id: 3, trackUri: "spotify:track:abc" }),
		]));
		expect(mocks.listQueueBySession).toHaveBeenCalledWith(7);
	});

	it("GET /session/:code/playback returns mapped Spotify playback", async () => {
		mocks.findSessionByCode.mockResolvedValueOnce({
			...session,
			spotifyAccessTokenEncrypted: "encrypted-access",
			spotifyRefreshTokenEncrypted: "encrypted-refresh",
		} as never);
		const response = await fetch(`${baseUrl}/session/123456/playback`);
		const body = await json(response);
		expect(response.status).toBe(200);
		expect(body.playback).toMatchObject({
			isPlaying: true,
			trackInfos: { title: "Playing Song" },
		});
		expect(mocks.getPlaybackState).toHaveBeenCalled();
	});

	it("POST /session/:code/queue adds a track and queues it when autoApprove is true", async () => {
		const response = await fetch(`${baseUrl}/session/123456/queue`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: "Bearer guest-token" },
			body: JSON.stringify(queueEntry),
		});
		const body = await json(response);
		expect(response.status).toBe(201);
		expect(mocks.validateQueueRequest).toHaveBeenCalledWith(7, 2, expect.objectContaining({ trackUri: "spotify:track:abc" }));
		expect(mocks.addTrackToSpotifyQueue).toHaveBeenCalledWith("spotify:track:abc", session);
		expect(mocks.createQueueEntry).toHaveBeenCalledWith(expect.objectContaining({
			sessionId: 7,
			guestId: 2,
			status: "Pending",
		}));
		expect(mocks.markQueueEntryQueued).toHaveBeenCalledWith(3);
		expect(body.queue).toEqual(expect.arrayContaining([
			expect.objectContaining({ id: 3, trackUri: "spotify:track:abc" }),
		]));
	});

	it("POST /session/:code/queue keeps the local entry queued when Spotify returns an ambiguous error", async () => {
		mocks.addTrackToSpotifyQueue.mockRejectedValueOnce(new Error("Spotify failed") as never);

		const response = await fetch(`${baseUrl}/session/123456/queue`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: "Bearer guest-token" },
			body: JSON.stringify(queueEntry),
		});
		const body = await json(response);
		expect(response.status).toBe(201);
		expect(mocks.createQueueEntry).toHaveBeenCalled();
		expect(mocks.markQueueEntryQueued).toHaveBeenCalledWith(3);
		expect(mocks.markQueueEntryFailed).not.toHaveBeenCalled();
		expect(body.entry).toMatchObject({ status: "Queued" });
	});

	it("PATCH /session/:code/settings updates host-only settings", async () => {
		const nextSettings = { ...session.settings, autoApprove: false };
		const response = await fetch(`${baseUrl}/session/123456/settings`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", Authorization: "Bearer host-token" },
			body: JSON.stringify(nextSettings),
		});
		expect(response.status).toBe(200);
		expect(mocks.getSessionForHostReconnect).toHaveBeenCalledWith(7, "host-token");
		expect(mocks.updateSessionSettings).toHaveBeenCalledWith(7, nextSettings);
	});

	it("POST /session/:code/queue/:entryId/approve approves and adds to Spotify", async () => {
		const response = await fetch(`${baseUrl}/session/123456/queue/3/approve`, {
			method: "POST",
			headers: { Authorization: "Bearer host-token" },
		});
		expect(response.status).toBe(200);
		expect(mocks.markQueueEntryQueued).toHaveBeenCalledWith(3);
		expect(mocks.addTrackToSpotifyQueue).toHaveBeenCalledWith("spotify:track:abc", session);
	});

	it("POST /session/:code/queue/:entryId/reject rejects an entry", async () => {
		const response = await fetch(`${baseUrl}/session/123456/queue/3/reject`, {
			method: "POST",
			headers: { Authorization: "Bearer host-token" },
		});
		expect(response.status).toBe(200);
		expect(mocks.markQueueEntryRejected).toHaveBeenCalledWith(3);
	});

	it("POST /session/:code/queue/:entryId/remove removes an entry", async () => {
		const response = await fetch(`${baseUrl}/session/123456/queue/3/remove`, {
			method: "POST",
			headers: { Authorization: "Bearer host-token" },
		});
		expect(response.status).toBe(200);
		expect(mocks.removeQueueEntry).toHaveBeenCalledWith(3);
	});

	it("POST /session/:code/guests/:guestId/ban bans a guest", async () => {
		const response = await fetch(`${baseUrl}/session/123456/guests/2/ban`, {
			method: "POST",
			headers: { Authorization: "Bearer host-token" },
		});
		expect(response.status).toBe(200);
		expect(mocks.banGuest).toHaveBeenCalledWith(2);
		expect(mocks.broadcastSessionSnapshot).toHaveBeenCalledWith("123456", "guests.updated");
	});

	it("GET /spotify/login resolves public session code to internal session id", async () => {
		const response = await fetch(`${baseUrl}/spotify/login?code=123456&returnTo=http%3A%2F%2F192.168.1.10%3A3000%2Fsession%2F123456`, { redirect: "manual" });
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("https://accounts.spotify.com/authorize?state=state");
		expect(mocks.findSessionByCode).toHaveBeenCalledWith("123456");
		expect(mocks.buildSpotifyAuthURL).toHaveBeenCalledWith(7, "http://192.168.1.10:3000");
	});

	it("GET /spotify/login returns 404 when the public code does not exist", async () => {
		mocks.findSessionByCode.mockResolvedValueOnce(null as never);
		const response = await fetch(`${baseUrl}/spotify/login?code=999999`, { redirect: "manual" });
		const body = await json(response);
		expect(response.status).toBe(404);
		expect(body.message).toBe("Session with that code was not found");
	});

	it("GET /spotify/callback links Spotify to the internal session and redirects to public code", async () => {
		const response = await fetch(`${baseUrl}/spotify/callback?code=spotify-code&state=state`, { redirect: "manual" });
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("http://localhost:3000/session/123456");
		expect(mocks.decryptOAuthState).toHaveBeenCalledWith("state");
		expect(mocks.linkSpotifyAccountToSession).toHaveBeenCalledWith(7, expect.objectContaining({
			access_token: "access",
			refresh_token: "refresh",
		}), expect.objectContaining({ id: "spotify-user" }));
	});

	it("GET /spotify/callback preserves oauth return origin", async () => {
		mocks.decryptOAuthState.mockResolvedValueOnce({
			sessionId: 7,
			returnTo: "http://192.168.1.10:3000",
		} as never);
		const response = await fetch(`${baseUrl}/spotify/callback?code=spotify-code&state=state`, { redirect: "manual" });
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("http://192.168.1.10:3000/session/123456");
	});
});
