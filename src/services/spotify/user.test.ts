import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fetchSpotifyProfile } from "./user";

const originalFetch = globalThis.fetch;

describe("fetchSpotifyProfile", () => {
	beforeEach(() => {
		globalThis.fetch = originalFetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("returns the Spotify profile payload", async () => {
		const expected = {
			display_name: "Ada",
			email: "ada@example.com",
			id: "spotify-user",
		};
		const response = new Response(JSON.stringify(expected), {
			headers: { "content-type": "application/json" },
		});
		const fetchMock = jest.fn(async () => response) as jest.MockedFunction<typeof fetch>;
		globalThis.fetch = fetchMock;

		await expect(fetchSpotifyProfile("token-123")).resolves.toEqual(expected);

		const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? [];
		expect(String(calledUrl)).toBe("https://api.spotify.com/v1/me");
		expect(calledInit?.method).toBe("GET");
		expect(calledInit?.headers).toEqual({
			Authorization: "Bearer token-123",
		});
	});

	it("throws a friendly error when spotify cannot be reached", async () => {
		const fetchMock = jest.fn(async () => {
			throw new Error("network error");
		});
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(fetchSpotifyProfile("token-123")).rejects.toThrow(
			"An error occured while communicating with Spotify API",
		);
	});
});
