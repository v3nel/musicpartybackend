import { beforeEach, describe, expect, it, mock } from "bun:test";

const prismaMock = {
	session: {
		findUnique: mock(async () => null),
	},
	guest: {
		findUnique: mock(async () => null),
	},
	queueEntry: {
		create: mock(async () => ({ id: 1 })),
	},
};

mock.module("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { createQueueEntry } = await import("./create");

describe("createQueueEntry", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
		prismaMock.guest.findUnique.mockReset();
		prismaMock.queueEntry.create.mockReset();
	});

	const basePayload = {
		sessionId: 1,
		guestId: 2,
		fromSpotifyPlaylist: true,
		trackUri: "spotify:track:1",
		spotifyTrackId: "1",
		title: "Song",
		artists: ["Artist"],
		albumImageUrl: "https://example.com/cover.jpg",
		durationMs: 1000,
		status: "Pending" as const,
	};

	it("throws when session does not exist", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce(null);
		await expect(createQueueEntry(basePayload)).rejects.toThrow(
			"Session with that id was not found",
		);
	});

	it("throws when guest does not exist", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 1 });
		prismaMock.guest.findUnique.mockResolvedValueOnce(null);
		await expect(createQueueEntry(basePayload)).rejects.toThrow(
			"Guest with that id was not found",
		);
	});

	it("throws when fromSpotifyPlaylist is missing", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 1 });
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 2 });
		const { fromSpotifyPlaylist: _value, ...payload } = basePayload;
		await expect(createQueueEntry(payload as typeof basePayload)).rejects.toThrow(
			"fromSpotifyPlaylist is required",
		);
	});

	it("throws when status is missing", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 1 });
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 2 });
		const { status: _status, ...payload } = basePayload;
		await expect(createQueueEntry(payload as typeof basePayload)).rejects.toThrow(
			"status is required",
		);
	});

	it("creates queue entry including optional properties", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 1 });
		prismaMock.guest.findUnique.mockResolvedValueOnce({ id: 2 });
		const requestedAt = new Date("2026-01-01T00:00:00.000Z");
		const queuedAt = new Date("2026-01-01T00:01:00.000Z");
		const payload = {
			...basePayload,
			requestedAt,
			queuedAt,
			failureReason: "none",
		};
		const expected = { id: 10 };
		prismaMock.queueEntry.create.mockResolvedValueOnce(expected);
		await expect(createQueueEntry(payload)).resolves.toEqual(expected);
		expect(prismaMock.queueEntry.create).toHaveBeenCalledWith({
			data: {
				sessionId: 1,
				guestId: 2,
				fromSpotifyPlaylist: true,
				status: "Pending",
				requestedAt,
				queuedAt,
				failureReason: "none",
				trackUri: "spotify:track:1",
				spotifyTrackId: "1",
				title: "Song",
				artists: ["Artist"],
				albumImageUrl: "https://example.com/cover.jpg",
				durationMs: 1000,
			},
		});
	});
});
