import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Session } from "../prisma/generated/client";

const refreshTokenIfNeededMock = jest.fn();
const parseSpotifyResponseMock = jest.fn();

jest.unstable_mockModule("./auth", () => ({
	refreshTokenIfNeeded: refreshTokenIfNeededMock,
}));

jest.unstable_mockModule("./parseApi", () => ({
	parseSpotifyResponse: parseSpotifyResponseMock,
}));

const { searchTracks, addTrackToSpotifyQueue, getPlaybackState } = await import("./music");

const originalFetch = globalThis.fetch;

function createSession(): Session {
	return { id: 12 } as Session;
}

describe("spotify music helpers", () => {
	beforeEach(() => {
		refreshTokenIfNeededMock.mockReset();
		parseSpotifyResponseMock.mockReset();
		globalThis.fetch = originalFetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("searchTracks calls the search endpoint", async () => {
		const session = createSession();
		refreshTokenIfNeededMock.mockResolvedValueOnce({ access_token: "token" });
		const expected = { tracks: { items: [] } };
		parseSpotifyResponseMock.mockResolvedValueOnce(expected);

		const response = new Response(JSON.stringify(expected), {
			headers: { "content-type": "application/json" },
		});
		const fetchMock = jest.fn(async () => response);
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(searchTracks("hello", session)).resolves.toEqual(expected);

		const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? [];
		const url = new URL(String(calledUrl));
		expect(url.origin + url.pathname).toBe("https://api.spotify.com/v1/search");
		expect(url.searchParams.get("q")).toBe("hello");
		expect(url.searchParams.get("type")).toBe("track");
		expect(url.searchParams.get("limit")).toBe("10");
		expect(calledInit?.method).toBe("GET");
		expect(calledInit?.headers).toEqual({
			Authorization: "Bearer token",
		});
	});

	it("searchTracks throws a friendly error on failure", async () => {
		const session = createSession();
		refreshTokenIfNeededMock.mockResolvedValueOnce({ access_token: "token" });
		parseSpotifyResponseMock.mockRejectedValueOnce(new Error("Spotify down"));
		const fetchMock = jest.fn(async () => new Response("{}"));
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(searchTracks("hello", session)).rejects.toThrow(
			"An error occured while communicating with spotify API",
		);
	});

	it("addTrackToSpotifyQueue enqueues a track", async () => {
		const session = createSession();
		refreshTokenIfNeededMock.mockResolvedValueOnce({ access_token: "token" });
		parseSpotifyResponseMock.mockResolvedValueOnce(null);

		const fetchMock = jest.fn(async () => new Response("{}"));
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(addTrackToSpotifyQueue("spotify:track:123", session)).resolves.toBe(
			null,
		);

		const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? [];
		const url = new URL(String(calledUrl));
		expect(url.origin + url.pathname).toBe(
			"https://api.spotify.com/v1/me/player/queue",
		);
		expect(url.searchParams.get("uri")).toBe("spotify:track:123");
		expect(calledInit?.method).toBe("POST");
		expect(calledInit?.headers).toEqual({
			Authorization: "Bearer token",
		});
	});

	it("addTrackToSpotifyQueue throws a friendly error on failure", async () => {
		const session = createSession();
		refreshTokenIfNeededMock.mockResolvedValueOnce({ access_token: "token" });
		parseSpotifyResponseMock.mockRejectedValueOnce(new Error("Spotify down"));
		const fetchMock = jest.fn(async () => new Response("{}"));
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(
			addTrackToSpotifyQueue("spotify:track:123", session),
		).rejects.toThrow("An error occured while adding song to Spotify queue");
	});

	it("getPlaybackState retrieves the player state", async () => {
		const session = createSession();
		refreshTokenIfNeededMock.mockResolvedValueOnce({ access_token: "token" });
		const expected = { device: { id: "abc" }, is_playing: false };
		parseSpotifyResponseMock.mockResolvedValueOnce(expected);
		const fetchMock = jest.fn(async () => new Response("{}"));
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(getPlaybackState(session)).resolves.toEqual(expected);

		const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? [];
		expect(String(calledUrl)).toBe("https://api.spotify.com/v1/me/player");
		expect(calledInit?.method).toBe("GET");
		expect(calledInit?.headers).toEqual({
			Authorization: "Bearer token",
		});
	});

	it("getPlaybackState throws a friendly error on failure", async () => {
		const session = createSession();
		refreshTokenIfNeededMock.mockResolvedValueOnce({ access_token: "token" });
		parseSpotifyResponseMock
			.mockRejectedValueOnce(new Error("Spotify down"))
			.mockRejectedValueOnce(new Error("Spotify down"));
		const fetchMock = jest.fn(async () => new Response("{}"));
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(getPlaybackState(session)).rejects.toThrow(
			"An error occured while trying to retrieve host playback state",
		);
	});
});
