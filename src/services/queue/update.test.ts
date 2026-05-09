import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	queueEntry: {
		update: jest.fn(async () => ({ id: 1 })),
	},
};

const findQueueEntryByIdMock = jest.fn(async () => null);

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

jest.unstable_mockModule("./find", () => ({
	findQueueEntryById: findQueueEntryByIdMock,
}));

const {
	markQueueEntryQueued,
	markQueueEntryRejected,
	markQueueEntryFailed,
} = await import("./update");

describe("markQueueEntryQueued", () => {
	beforeEach(() => {
		findQueueEntryByIdMock.mockReset();
		prismaMock.queueEntry.update.mockReset();
	});

	it("throws when queue entry is missing", async () => {
		findQueueEntryByIdMock.mockResolvedValueOnce(null);
		await expect(markQueueEntryQueued(5)).rejects.toThrow(
			"QueueEntry with that id was not found",
		);
		expect(prismaMock.queueEntry.update).not.toHaveBeenCalled();
	});

	it("marks queue entry as queued", async () => {
		const expected = { id: 5, status: "Queued" };
		findQueueEntryByIdMock.mockResolvedValueOnce({ id: 5 });
		prismaMock.queueEntry.update.mockResolvedValueOnce(expected);

		await expect(markQueueEntryQueued(5)).resolves.toEqual(expected);
		expect(prismaMock.queueEntry.update).toHaveBeenCalledWith({
			where: { id: 5 },
			data: { status: "Queued", queuedAt: expect.any(Date) },
		});
	});
});

describe("markQueueEntryRejected", () => {
	beforeEach(() => {
		findQueueEntryByIdMock.mockReset();
		prismaMock.queueEntry.update.mockReset();
	});

	it("throws when queue entry is missing", async () => {
		findQueueEntryByIdMock.mockResolvedValueOnce(null);
		await expect(markQueueEntryRejected(7)).rejects.toThrow(
			"QueueEntry with that id was not found",
		);
		expect(prismaMock.queueEntry.update).not.toHaveBeenCalled();
	});

	it("marks queue entry as rejected", async () => {
		const expected = { id: 7, status: "Rejected" };
		findQueueEntryByIdMock.mockResolvedValueOnce({ id: 7 });
		prismaMock.queueEntry.update.mockResolvedValueOnce(expected);

		await expect(markQueueEntryRejected(7)).resolves.toEqual(expected);
		expect(prismaMock.queueEntry.update).toHaveBeenCalledWith({
			where: { id: 7 },
			data: { status: "Rejected" },
		});
	});
});

describe("markQueueEntryFailed", () => {
	beforeEach(() => {
		findQueueEntryByIdMock.mockReset();
		prismaMock.queueEntry.update.mockReset();
	});

	it("throws when queue entry is missing", async () => {
		findQueueEntryByIdMock.mockResolvedValueOnce(null);
		await expect(markQueueEntryFailed(8, "oops")).rejects.toThrow(
			"QueueEntry with that id was not found",
		);
		expect(prismaMock.queueEntry.update).not.toHaveBeenCalled();
	});

	it("marks queue entry as failed with a reason", async () => {
		const expected = { id: 8, status: "Failed", failureReason: "oops" };
		findQueueEntryByIdMock.mockResolvedValueOnce({ id: 8 });
		prismaMock.queueEntry.update.mockResolvedValueOnce(expected);

		await expect(markQueueEntryFailed(8, "oops")).resolves.toEqual(expected);
		expect(prismaMock.queueEntry.update).toHaveBeenCalledWith({
			where: { id: 8 },
			data: { status: "Failed", failureReason: "oops" },
		});
	});
});
