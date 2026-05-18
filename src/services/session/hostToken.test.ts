import { describe, expect, it } from "@jest/globals";
import { createHostToken, hashHostToken, verifyHostToken } from "./hostToken";

describe("hostToken helpers", () => {
	it("hashHostToken is deterministic", () => {
		const hashA = hashHostToken("token-123");
		const hashB = hashHostToken("token-123");
		expect(hashA).toBe(hashB);
		expect(hashA).toHaveLength(64);
	});

	it("verifyHostToken returns true for matching hash", () => {
		const token = "token-456";
		const hash = hashHostToken(token);
		expect(verifyHostToken(token, hash)).toBe(true);
	});

	it("verifyHostToken returns false for invalid hash length", () => {
		expect(verifyHostToken("token", "short")).toBe(false);
	});

	it("verifyHostToken returns false when hash is not valid hex", () => {
		const invalidHex = "g".repeat(64);
		expect(verifyHostToken("token", invalidHex)).toBe(false);
	});

	it("createHostToken returns payload with token and hash", () => {
		const payload = createHostToken();
		expect(payload.token).toEqual(expect.any(String));
		expect(payload.tokenHash).toHaveLength(64);
		expect(payload.issuedAt).toEqual(expect.any(Date));
		expect(verifyHostToken(payload.token, payload.tokenHash)).toBe(true);
	});
});
