import crypto from "node:crypto";

type HostTokenPayload = {
	token: string;
	tokenHash: string;
	issuedAt: Date;
};

const HOST_TOKEN_SIZE_BYTES = 32;

export function hashHostToken(token: string): string {
	return crypto.createHash("sha256").update(token, "utf-8").digest("hex");
}

export function createHostToken(): HostTokenPayload {
	const token = crypto.randomBytes(HOST_TOKEN_SIZE_BYTES).toString("base64url");
	return {
		token,
		tokenHash: hashHostToken(token),
		issuedAt: new Date(),
	};
}

export function verifyHostToken(token: string, tokenHash: string): boolean {
	if (tokenHash.length !== 64) {
		return false;
	}
	const candidateHash = hashHostToken(token);
	try {
		return crypto.timingSafeEqual(
			Buffer.from(candidateHash, "hex"),
			Buffer.from(tokenHash, "hex"),
		);
	} catch {
		return false;
	}
}
