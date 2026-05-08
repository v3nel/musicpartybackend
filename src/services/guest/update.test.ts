import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	guest: {
		findUnique: jest.fn(async () => null),
		update: jest.fn(async () => ({ id: 1 })),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { markGuestAsLeft, markGuestAsSeen } = await import("./update");

describe("guest update service", () => {
	beforeEach(() => {
		prismaMock.guest.findUnique.mockReset();
		prismaMock.guest.update.mockReset();
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
});
