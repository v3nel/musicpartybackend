import crypto from "node:crypto";

const GUEST_TOKEN_SIZE_BYTES = 32;

export function createGuestToken() {
	const token = crypto.randomBytes(GUEST_TOKEN_SIZE_BYTES).toString("base64url");
	return {
		token,
		tokenHash: hashGuestToken(token),
	};
}

export function hashGuestToken(token: string): string {
	return crypto.createHash("sha256").update(token, "utf-8").digest("hex");
}
