import { describe, expect, it } from "@jest/globals";
import { isSpotifyApiError, parseSpotifyResponse } from "./parseApi";

describe("isSpotifyApiError", () => {
	it("returns false for invalid payloads", () => {
		expect(isSpotifyApiError(null)).toBe(false);
		expect(isSpotifyApiError("error")).toBe(false);
		expect(isSpotifyApiError({})).toBe(false);
	});

	it("returns true when payload contains an error object", () => {
		expect(isSpotifyApiError({ error: { status: 401, message: "Nope" } })).toBe(true);
	});
});

describe("parseSpotifyResponse", () => {
	it("returns parsed payload when response is valid", async () => {
		const response = new Response(JSON.stringify({ track: "abc" }), {
			headers: { "content-type": "application/json" },
		});
		await expect(parseSpotifyResponse<{ track: string }>(response)).resolves.toEqual({
			track: "abc",
		});
	});

	it("throws spotify message with status code", async () => {
		const response = new Response(JSON.stringify({
			error: { status: 403, message: "Forbidden" },
		}), {
			headers: { "content-type": "application/json" },
		});
		await expect(parseSpotifyResponse(response)).rejects.toThrow("Forbidden (403)");
	});

	it("falls back to unknown spotify api error message", async () => {
		const response = new Response(JSON.stringify({ error: { status: 500 } }), {
			headers: { "content-type": "application/json" },
		});
		await expect(parseSpotifyResponse(response)).rejects.toThrow(
			"Unknown Spotify API error (500)",
		);
	});
});
