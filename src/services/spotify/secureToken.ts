import crypto from "crypto";
import argon2 from "argon2";

export async function secureSpotifyToken(token: string) {
	const secret = process.env.SPOTIFY_ENCRYPTION_PHRASE;
	if (!secret) {
		throw new Error("Missing SPOTIFY_ENCRYPTION_PHRASE");
	}

	const salt = crypto.randomBytes(16);
	const iv = crypto.randomBytes(12);

	const key = (await argon2.hash(secret, {
		type: argon2.argon2id,
		salt,
		hashLength: 32,
		raw: true,
		timeCost: 3,
		memoryCost: 65536,
		parallelism: 1,
	})) as Buffer;

	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();

	return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}

export async function decryptSpotifyToken(etoken: string) {
	const secret = process.env.SPOTIFY_ENCRYPTION_PHRASE;
	if (!secret) {
		throw new Error("Missing SPOTIFY_ENCRYPTION_PHRASE");
	}

	const data = Buffer.from(etoken, "base64");
	if (data.length < 44) {
		throw new Error("Invalid encrypted token format");
	}

	const salt = data.subarray(0, 16);
	const iv = data.subarray(16, 28);
	const tag = data.subarray(28, 44);
	const encrypted = data.subarray(44);

	const key = (await argon2.hash(secret, {
		type: argon2.argon2id,
		salt,
		hashLength: 32,
		raw: true,
		timeCost: 3,
		memoryCost: 65536,
		parallelism: 1,
	})) as Buffer;

	const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(tag);

	const decrypted = Buffer.concat([
		decipher.update(encrypted),
		decipher.final(),
	]);

	return decrypted.toString("utf8");
}