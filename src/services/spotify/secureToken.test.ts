import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { decryptSpotifyToken, secureSpotifyToken } from "./secureToken";

describe("spotify token crypto helpers", () => {
	const originalPhrase = process.env.SPOTIFY_ENCRYPTION_PHRASE;

	beforeEach(() => {
		process.env.SPOTIFY_ENCRYPTION_PHRASE = "unit-test-passphrase";
	});

	afterEach(() => {
		process.env.SPOTIFY_ENCRYPTION_PHRASE = originalPhrase;
	});

	it("encrypts and decrypts a token", async () => {
		const token = "spotify-token-value";
		const encrypted = await secureSpotifyToken(token);
		const decrypted = await decryptSpotifyToken(encrypted);
		expect(decrypted).toBe(token);
	});

	it("throws when encryption phrase is missing for encryption", async () => {
		delete process.env.SPOTIFY_ENCRYPTION_PHRASE;
		await expect(secureSpotifyToken("token")).rejects.toThrow(
			"Missing SPOTIFY_ENCRYPTION_PHRASE",
		);
	});

	it("throws when encryption phrase is missing for decryption", async () => {
		const encrypted = await secureSpotifyToken("token");
		delete process.env.SPOTIFY_ENCRYPTION_PHRASE;
		await expect(decryptSpotifyToken(encrypted)).rejects.toThrow(
			"Missing SPOTIFY_ENCRYPTION_PHRASE",
		);
	});

	it("throws on invalid encrypted payload format", async () => {
		await expect(decryptSpotifyToken("abcd")).rejects.toThrow(
			"Invalid encrypted token format",
		);
	});

	it("throws when payload integrity is broken", async () => {
		const encrypted = await secureSpotifyToken("token");
		const bytes = Buffer.from(encrypted, "base64");
		bytes[bytes.length - 1] = bytes[bytes.length - 1] ^ 1;
		const tampered = bytes.toString("base64");
		await expect(decryptSpotifyToken(tampered)).rejects.toThrow();
	});
});
