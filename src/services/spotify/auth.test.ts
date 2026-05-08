import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
	buildSpotifyAuthURL,
	decryptOAuthState,
	exchangeCodeforToken,
} from "./auth";

const originalEnv = {
	SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
	SPOTIFY_SECRET_ID: process.env.SPOTIFY_SECRET_ID,
	SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
	SPOTIFY_SCOPES: process.env.SPOTIFY_SCOPES,
	SPOTIFY_STATE_ENCRYPTION_PHRASE: process.env.SPOTIFY_STATE_ENCRYPTION_PHRASE,
};

const originalFetch = globalThis.fetch;

const TEST_ENV = {
	SPOTIFY_CLIENT_ID: "client-id",
	SPOTIFY_SECRET_ID: "secret-id",
	SPOTIFY_REDIRECT_URI: "https://localhost/callback",
	SPOTIFY_SCOPES: "user-read-email",
	SPOTIFY_STATE_ENCRYPTION_PHRASE: "0123456789abcdef0123456789abcdef",
};

function restoreEnv() {
	for (const [key, value] of Object.entries(originalEnv)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

describe("buildSpotifyAuthURL", () => {
	beforeEach(() => {
		process.env.SPOTIFY_CLIENT_ID = TEST_ENV.SPOTIFY_CLIENT_ID;
		process.env.SPOTIFY_SECRET_ID = TEST_ENV.SPOTIFY_SECRET_ID;
		process.env.SPOTIFY_REDIRECT_URI = TEST_ENV.SPOTIFY_REDIRECT_URI;
		process.env.SPOTIFY_SCOPES = TEST_ENV.SPOTIFY_SCOPES;
		process.env.SPOTIFY_STATE_ENCRYPTION_PHRASE =
			TEST_ENV.SPOTIFY_STATE_ENCRYPTION_PHRASE;
	});

	afterEach(() => {
		restoreEnv();
		globalThis.fetch = originalFetch;
	});

	it("throws when required env variables are missing", async () => {
		delete process.env.SPOTIFY_CLIENT_ID;
		await expect(buildSpotifyAuthURL(5)).rejects.toThrow(
			"Missing env variables for spotify authentication",
		);
	});

	it("returns a URL with a decryptable state", async () => {
		const url = await buildSpotifyAuthURL(42);
		expect(url.origin).toBe("https://account.spotify.com");
		expect(url.pathname).toBe("/authorize");
		expect(url.searchParams.get("client_id")).toBe("client-id");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("redirect_uri")).toBe(
			"https://localhost/callback",
		);
		expect(url.searchParams.get("scope")).toBe("user-read-email");
		expect(url.searchParams.get("show_dialog")).toBe("true");

		const state = url.searchParams.get("state");
		expect(state).toBeTruthy();
		const decrypted = await decryptOAuthState(state as string);
		expect(decrypted.sessionId).toBe(42);
		expect(typeof decrypted.nonce).toBe("string");
	});
});

describe("exchangeCodeforToken", () => {
	beforeEach(() => {
		process.env.SPOTIFY_CLIENT_ID = TEST_ENV.SPOTIFY_CLIENT_ID;
		process.env.SPOTIFY_SECRET_ID = TEST_ENV.SPOTIFY_SECRET_ID;
		process.env.SPOTIFY_REDIRECT_URI = TEST_ENV.SPOTIFY_REDIRECT_URI;
	});

	afterEach(() => {
		restoreEnv();
		globalThis.fetch = originalFetch;
	});

	it("throws when required env variables are missing", async () => {
		delete process.env.SPOTIFY_REDIRECT_URI;
		await expect(exchangeCodeforToken("abc")).rejects.toThrow(
			"Missng env variables for spotify authentication",
		);
	});

	it("returns the token response from Spotify", async () => {
		const expected = {
			access_token: "access",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "refresh",
			scope: "user-read-email",
		};
		const response = new Response(JSON.stringify(expected), {
			headers: { "content-type": "application/json" },
		});
		const fetchMock = jest.fn(async () => response);
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(exchangeCodeforToken("abc")).resolves.toEqual(expected);

		const [calledUrl, calledInit] = fetchMock.mock.calls[0];
		expect(String(calledUrl)).toBe("https://accounts.spotify.com/api/token");
		expect(calledInit?.method).toBe("POST");
		expect(calledInit?.headers).toEqual({
			"Content-Type": "application/x-www-url-urlencoded",
			Authorization: "Basic " + Buffer.from("client-id:secret-id").toString("base64"),
		});
		expect(calledInit?.body).toBe(
			JSON.stringify({
				grant_type: "authorization_code",
				code: "abc",
				redirect_uri: "https://localhost/callback",
			}),
		);
	});

	it("throws a friendly error when spotify rejects the request", async () => {
		const response = new Response(
			JSON.stringify({ error: { status: 403, message: "Forbidden" } }),
			{
				headers: { "content-type": "application/json" },
			},
		);
		const fetchMock = jest.fn(async () => response);
		globalThis.fetch = fetchMock as typeof fetch;

		await expect(exchangeCodeforToken("abc")).rejects.toThrow(
			"An error occurred while communicating with Spotify API",
		);
	});
});
