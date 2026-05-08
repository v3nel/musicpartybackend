import { describe, expect, it } from "@jest/globals";
import { getHealthStatus } from "./healthService";

describe("getHealthStatus", () => {
	it("returns an ok status with an ISO timestamp", () => {
		const result = getHealthStatus();
		expect(result.status).toBe("ok");
		expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
	});
});
