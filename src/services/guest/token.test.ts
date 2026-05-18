import { describe, expect, it } from "@jest/globals";
import { createGuestToken, hashGuestToken } from "./token";

describe("guest token helpers", () => {
	it("hashGuestToken is deterministic", () => {
		const hashA = hashGuestToken("token-1");
		const hashB = hashGuestToken("token-1");
		expect(hashA).toBe(hashB);
		expect(hashA).toHaveLength(64);
	});

	it("createGuestToken returns token and hash", () => {
		const payload = createGuestToken();
		expect(payload.token).toEqual(expect.any(String));
		expect(payload.tokenHash).toHaveLength(64);
		expect(hashGuestToken(payload.token)).toBe(payload.tokenHash);
	});
});
