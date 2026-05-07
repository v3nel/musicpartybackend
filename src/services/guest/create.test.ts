import { beforeEach, describe, expect, it, mock } from "bun:test";

const prismaMock = {
	session: {
		findUnique: mock(async () => null),
	},
	guest: {
		create: mock(async () => ({ id: 1 })),
	},
};

mock.module("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { createGuest } = await import("./create");

describe("createGuest", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
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
});
