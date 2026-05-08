import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	session: {
		findUnique: jest.fn(async () => null),
	},
	queueEntry: {
		findMany: jest.fn(async () => []),
		findUnique: jest.fn(async () => null),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { findQueueEntryById, listQueueBySession } = await import("./find");

describe("listQueueBySession", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
		prismaMock.queueEntry.findMany.mockReset();
	});

	it("throws when session does not exist", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce(null);
		await expect(listQueueBySession(3)).rejects.toThrow(
			"Session with this id was not found",
		);
		expect(prismaMock.queueEntry.findMany).not.toHaveBeenCalled();
	});

	it("returns sorted queue entries for the session", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 3 });
		const expected = [{ id: 1 }, { id: 2 }];
		prismaMock.queueEntry.findMany.mockResolvedValueOnce(expected);
		await expect(listQueueBySession(3)).resolves.toEqual(expected);
		expect(prismaMock.queueEntry.findMany).toHaveBeenCalledWith({
			where: { sessionId: 3 },
			orderBy: { queuedAt: "desc" },
		});
	});
});
