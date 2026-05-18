import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	session: {
		findUnique: jest.fn(async () => null),
	},
	guest: {
		findUnique: jest.fn(async () => null),
		create: jest.fn(async () => ({ id: 1 })),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { createGuest, ensureHostShadowGuest } = await import("./create");

describe("createGuest", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
		prismaMock.guest.findUnique.mockReset();
		prismaMock.guest.create.mockReset();
	});

	it("throws when session does not exist", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce(null);
		await expect(createGuest(1, "Alice", "hash")).rejects.toThrow(
			"Session with that id was not found",
		);
		expect(prismaMock.guest.create).not.toHaveBeenCalled();
	});

	it("creates a guest for existing session", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 1 });
		const expected = { id: 2, sessionId: 1, displayName: "Alice", tokenHash: "hash" };
		prismaMock.guest.create.mockResolvedValueOnce(expected);
		await expect(createGuest(1, "Alice", "hash")).resolves.toEqual(expected);
		expect(prismaMock.guest.create).toHaveBeenCalledWith({
			data: {
				sessionId: 1,
				displayName: "Alice",
				tokenHash: "hash",
			},
		});
	});

	it("returns existing host shadow guest", async () => {
		const existing = { id: 9, sessionId: 2, displayName: "Host", tokenHash: "hash" };
		prismaMock.guest.findUnique.mockResolvedValueOnce(existing);
		await expect(ensureHostShadowGuest(2, "token", "DJ")).resolves.toEqual(existing);
		expect(prismaMock.guest.create).not.toHaveBeenCalled();
	});

	it("creates a host shadow guest when missing", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce(null);
		const expected = { id: 10, sessionId: 2, displayName: "DJ", tokenHash: "hash" };
		prismaMock.guest.create.mockResolvedValueOnce(expected);
		await expect(ensureHostShadowGuest(2, "token", "DJ")).resolves.toEqual(expected);
		expect(prismaMock.guest.create).toHaveBeenCalledWith({
			data: {
				sessionId: 2,
				displayName: "DJ",
				tokenHash: expect.any(String),
				isHost: true,
			},
		});
	});
});
