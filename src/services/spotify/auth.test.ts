import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const updateSessionSpotifyTokensMock = jest.fn();

jest.unstable_mockModule("../session/update", () => ({
	updateSessionSpotifyTokens: updateSessionSpotifyTokensMock,
}));

const {
	buildSpotifyAuthURL,
	decryptOAuthState,
	exchangeCodeforToken,
	refreshTokenIfNeeded,
} = await import("./auth");
const { secureSpotifyToken } = await import("./secureToken");

const originalEnv = {
	SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
	SPOTIFY_SECRET_ID: process.env.SPOTIFY_SECRET_ID,
	SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
	SPOTIFY_SCOPES: process.env.SPOTIFY_SCOPES,
	SPOTIFY_STATE_ENCRYPTION_PHRASE: process.env.SPOTIFY_STATE_ENCRYPTION_PHRASE,
	SPOTIFY_ENCRYPTION_PHRASE: process.env.SPOTIFY_ENCRYPTION_PHRASE,
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
		expect(url.origin).toBe("https://accounts.spotify.com");
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

	it("accepts a normal passphrase length for oauth state encryption", async () => {
		process.env.SPOTIFY_STATE_ENCRYPTION_PHRASE = "short-secret";
		const url = await buildSpotifyAuthURL(12);
		const state = url.searchParams.get("state");
		expect(state).toBeTruthy();
		await expect(decryptOAuthState(state as string)).resolves.toMatchObject({
			sessionId: 12,
		});
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
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: "Basic " + Buffer.from("client-id:secret-id").toString("base64"),
		});
		expect(String(calledInit?.body)).toBe("grant_type=authorization_code&code=abc&redirect_uri=https%3A%2F%2Flocalhost%2Fcallback");
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

describe("refreshTokenIfNeeded", () => {
	beforeEach(() => {
		process.env.SPOTIFY_CLIENT_ID = TEST_ENV.SPOTIFY_CLIENT_ID;
		process.env.SPOTIFY_SECRET_ID = TEST_ENV.SPOTIFY_SECRET_ID;
		process.env.SPOTIFY_ENCRYPTION_PHRASE = "spotify-token-secret";
		updateSessionSpotifyTokensMock.mockReset();
	});

	afterEach(() => {
		restoreEnv();
		globalThis.fetch = originalFetch;
	});

	it("accepts Prisma BigInt token expiry values", async () => {
		const accessToken = await secureSpotifyToken("access");
		const refreshToken = await secureSpotifyToken("refresh");
		const session = {
			id: 7,
			spotifyAccessTokenEncrypted: accessToken,
			spotifyRefreshTokenEncrypted: refreshToken,
			spotifyTokenExpiresAt: BigInt(Date.now() + 60_000),
		};

		await expect(refreshTokenIfNeeded(session as never)).resolves.toEqual({
			access_token: "access",
			refresh_token: "refresh",
			expires_at: Number(session.spotifyTokenExpiresAt),
		});
	});

	it("keeps the existing refresh token when Spotify refresh response omits one", async () => {
		const accessToken = await secureSpotifyToken("old-access");
		const refreshToken = await secureSpotifyToken("old-refresh");
		const response = new Response(JSON.stringify({
			access_token: "new-access",
			token_type: "Bearer",
			scope: "user-read-email",
			expires_in: 3600,
		}), {
			headers: { "content-type": "application/json" },
		});
		const fetchMock = jest.fn(async () => response);
		globalThis.fetch = fetchMock as typeof fetch;

		const result = await refreshTokenIfNeeded({
			id: 7,
			spotifyAccessTokenEncrypted: accessToken,
			spotifyRefreshTokenEncrypted: refreshToken,
			spotifyTokenExpiresAt: BigInt(Date.now() - 1_000),
		} as never);

		expect(result.access_token).toBe("new-access");
		expect(result.refresh_token).toBe("old-refresh");
		expect(updateSessionSpotifyTokensMock).toHaveBeenCalledWith(7, expect.objectContaining({
			access_token: expect.any(String),
			refresh_token: expect.any(String),
			expires_at: expect.any(Number),
		}));
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.headers).toEqual({
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: "Basic " + Buffer.from("client-id:secret-id").toString("base64"),
		});
		expect(String(init?.body)).toBe("grant_type=refresh_token&refresh_token=old-refresh");
	});
});
