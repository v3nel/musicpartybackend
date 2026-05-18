import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	guest: {
		findUnique: jest.fn(async () => null),
		update: jest.fn(async () => ({ id: 1 })),
	},
	queueEntry: {
		deleteMany: jest.fn(async () => ({ count: 0 })),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { banGuest, markGuestAsLeft, markGuestAsSeen, setGuestCoHost } = await import("./update");

describe("guest update service", () => {
	beforeEach(() => {
		prismaMock.guest.findUnique.mockReset();
		prismaMock.guest.update.mockReset();
		prismaMock.queueEntry.deleteMany.mockReset();
	});

	it("throws when marking seen for missing guest", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce(null);
		await expect(markGuestAsSeen(9)).rejects.toThrow("Guest with that id was not found");
	});

	it("marks guest as seen", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 9 });
		const expected = { id: 9 };
		prismaMock.guest.update.mockResolvedValueOnce(expected);
		await expect(markGuestAsSeen(9)).resolves.toEqual(expected);
		expect(prismaMock.guest.update).toHaveBeenCalledWith({
			where: { id: 9 },
			data: { lastSeenAt: expect.any(Date) },
		});
	});

	it("throws when marking left for missing guest", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce(null);
		await expect(markGuestAsLeft(2)).rejects.toThrow("Guest with that id was not found");
	});

	it("marks guest as left", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 2 });
		const expected = { id: 2 };
		prismaMock.guest.update.mockResolvedValueOnce(expected);
		await expect(markGuestAsLeft(2)).resolves.toEqual(expected);
		expect(prismaMock.guest.update).toHaveBeenCalledWith({
			where: { id: 2 },
			data: { leftAt: expect.any(Date) },
		});
	});

	it("throws when banning missing guest", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce(null);
		await expect(banGuest(3)).rejects.toThrow("Guest with that id was not found");
	});

	it("throws when banning the host", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 3, isHost: true });
		await expect(banGuest(3)).rejects.toThrow("Cannot ban the host");
	});

	it("bans a guest and clears queued entries", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 4, isHost: false });
		const expected = { id: 4, bannedAt: new Date("2026-05-18T10:00:00.000Z") };
		prismaMock.guest.update.mockResolvedValueOnce(expected);
		await expect(banGuest(4)).resolves.toEqual(expected);
		expect(prismaMock.queueEntry.deleteMany).toHaveBeenCalledWith({
			where: { guestId: 4 },
		});
		expect(prismaMock.guest.update).toHaveBeenCalledWith({
			where: { id: 4 },
			data: {
				bannedAt: expect.any(Date),
				isCoHost: false,
			},
		});
	});

	it("throws when promoting a missing guest", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce(null);
		await expect(setGuestCoHost(8, true)).rejects.toThrow(
			"Guest with that id was not found",
		);
	});

	it("throws when promoting the host", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 8, isHost: true });
		await expect(setGuestCoHost(8, true)).rejects.toThrow("Cannot promote the host");
	});

	it("throws when promoting a banned guest", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce({
			id: 8,
			isHost: false,
			bannedAt: new Date(),
		});
		await expect(setGuestCoHost(8, true)).rejects.toThrow(
			"Cannot promote a banned guest",
		);
	});

	it("updates co-host flag", async () => {
		prismaMock.guest.findUnique.mockResolvedValueOnce({
			id: 9,
			isHost: false,
			bannedAt: null,
		});
		prismaMock.guest.update.mockResolvedValueOnce({ id: 9, isCoHost: true });
		await expect(setGuestCoHost(9, true)).resolves.toEqual({
			id: 9,
			isCoHost: true,
		});
		expect(prismaMock.guest.update).toHaveBeenCalledWith({
			where: { id: 9 },
			data: { isCoHost: true },
		});
	});
});
