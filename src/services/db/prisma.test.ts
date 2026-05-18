import { describe, expect, it, jest } from "@jest/globals";

describe("prisma client initialization", () => {
	it("throws when DATABASE_URL is missing", async () => {
		const original = process.env.DATABASE_URL;
		delete process.env.DATABASE_URL;
		jest.resetModules();

		await expect(import("./prisma")).rejects.toThrow(
			"DATABASE_URL is required to initialize Prisma.",
		);

		if (original) {
			process.env.DATABASE_URL = original;
		}
	});

	it("creates prisma client when DATABASE_URL is set", async () => {
		const original = process.env.DATABASE_URL;
		process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
		jest.resetModules();

		const module = await import("./prisma");
		expect(module.default).toBeDefined();
		expect(typeof module.default.$connect).toBe("function");

		if (original) {
			process.env.DATABASE_URL = original;
		}
	});
});
