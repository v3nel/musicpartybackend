import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	session: {
		findUnique: jest.fn(async () => null),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { findSessionByCode, findSessionById, isCodeAvailable } = await import("./find.ts");

describe("session find service", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
	});

	it("throws when session code is not 6 digits in findSessionByCode", async () => {
		await expect(findSessionByCode("123")).rejects.toThrow(
			"The session code has to be 6 digits",
		);
	});

	it("throws when session code is not 6 digits in isCodeAvailable", async () => {
		await expect(isCodeAvailable("123")).rejects.toThrow(
			"The session code has to be 6 digits",
		);
	});

	it("returns session by code", async () => {
		const expected = { id: 12, code: "654321" };
		prismaMock.session.findUnique.mockResolvedValueOnce(expected);
		await expect(findSessionByCode("654321")).resolves.toEqual(expected);
		expect(prismaMock.session.findUnique).toHaveBeenCalledWith({
			where: { code: "654321" },
		});
	});

	it("returns code availability", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce(null);
		await expect(isCodeAvailable("123456")).resolves.toBe(true);
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 1 });
		await expect(isCodeAvailable("123456")).resolves.toBe(false);
	});

	it("returns session by id", async () => {
		const expected = { id: 4 };
		prismaMock.session.findUnique.mockResolvedValueOnce(expected);
		await expect(findSessionById(4)).resolves.toEqual(expected);
		expect(prismaMock.session.findUnique).toHaveBeenCalledWith({
			where: { id: 4 },
		});
	});
});
