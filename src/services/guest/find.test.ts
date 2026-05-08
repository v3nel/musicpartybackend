import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	guest: {
		findUnique: jest.fn(async () => null),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { findGuestById, findGuestByToken } = await import("./find");

describe("guest find service", () => {
	beforeEach(() => {
		prismaMock.guest.findUnique.mockReset();
	});

	it("finds guest by id", async () => {
		const expected = { id: 4 };
		prismaMock.guest.findUnique.mockResolvedValueOnce(expected);
		await expect(findGuestById(4)).resolves.toEqual(expected);
		expect(prismaMock.guest.findUnique).toHaveBeenCalledWith({
			where: { id: 4 },
		});
	});

	it("finds guest by token", async () => {
		const expected = { id: 5, tokenHash: "abc" };
		prismaMock.guest.findUnique.mockResolvedValueOnce(expected);
		await expect(findGuestByToken("abc")).resolves.toEqual(expected);
		expect(prismaMock.guest.findUnique).toHaveBeenCalledWith({
			where: { tokenHash: "abc" },
		});
	});
});
