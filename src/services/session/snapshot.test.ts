import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	guest: {
		findMany: jest.fn(async () => []),
	},
	queueEntry: {
		findMany: jest.fn(async () => []),
		deleteMany: jest.fn(async () => ({ count: 0 })),
	},
};

const findSessionByCodeMock = jest.fn(async () => null);
const getPlaybackStateMock = jest.fn(async () => null);
const mapPlaybackStateMock = jest.fn();

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

jest.unstable_mockModule("./find", () => ({
	findSessionByCode: findSessionByCodeMock,
}));

jest.unstable_mockModule("../spotify/music", () => ({
	getPlaybackState: getPlaybackStateMock,
	mapPlaybackState: mapPlaybackStateMock,
}));

const { getSessionSnapshot } = await import("./snapshot");

describe("getSessionSnapshot", () => {
	beforeEach(() => {
		findSessionByCodeMock.mockReset();
		getPlaybackStateMock.mockReset();
		mapPlaybackStateMock.mockReset();
		prismaMock.guest.findMany.mockReset();
		prismaMock.queueEntry.findMany.mockReset();
		prismaMock.queueEntry.deleteMany.mockReset();
	});

	it("throws when session is missing", async () => {
		findSessionByCodeMock.mockResolvedValueOnce(null);
		await expect(getSessionSnapshot("123456")).rejects.toThrow(
			"Session with that code was not found",
		);
	});

	it("returns guests and queue when no spotify tokens", async () => {
		const session = {
			id: 1,
			code: "123456",
			status: "Ready",
			settings: { autoApprove: true },
			spotifyDisplayName: null,
			spotifyAccessTokenEncrypted: null,
			spotifyRefreshTokenEncrypted: null,
		};
		const guests = [{ id: 1, displayName: "Alice" }];
		const queue = [{ id: 2, spotifyTrackId: "track" }];
		findSessionByCodeMock.mockResolvedValueOnce(session);
		prismaMock.guest.findMany.mockResolvedValueOnce(guests);
		prismaMock.queueEntry.findMany.mockResolvedValueOnce(queue);

		const snapshot = await getSessionSnapshot("123456");
		expect(snapshot.session).toMatchObject({ id: 1, code: "123456" });
		expect(snapshot.guests).toEqual(guests);
		expect(snapshot.queue).toEqual(queue);
		expect(snapshot.playback).toBeNull();
	});

	it("removes currently playing track from queue", async () => {
		const session = {
			id: 2,
			code: "222222",
			status: "Ready",
			settings: { autoApprove: true },
			spotifyDisplayName: "Host",
			spotifyAccessTokenEncrypted: "encrypted-access",
			spotifyRefreshTokenEncrypted: "encrypted-refresh",
		};
		const queue = [
			{ id: 10, spotifyTrackId: "track-1", status: "Queued" },
			{ id: 11, spotifyTrackId: "track-2", status: "Pending" },
		];
		const playback = {
			isPlaying: true,
			trackInfos: { spotifyTrackId: "track-1" },
			progressMs: 1000,
			timestamp: 1,
		};
		findSessionByCodeMock.mockResolvedValueOnce(session);
		prismaMock.guest.findMany.mockResolvedValueOnce([]);
		prismaMock.queueEntry.findMany.mockResolvedValueOnce(queue);
		getPlaybackStateMock.mockResolvedValueOnce({ state: true });
		mapPlaybackStateMock.mockReturnValueOnce(playback);

		const snapshot = await getSessionSnapshot("222222");
		expect(prismaMock.queueEntry.deleteMany).toHaveBeenCalledWith({
			where: { id: 10 },
		});
		expect(snapshot.queue).toEqual([{ id: 11, spotifyTrackId: "track-2", status: "Pending" }]);
		expect(snapshot.playback).toEqual(playback);
	});

	it("pauses cached playback when spotify returns null", async () => {
		const session = {
			id: 3,
			code: "333333",
			status: "Ready",
			settings: { autoApprove: true },
			spotifyDisplayName: "Host",
			spotifyAccessTokenEncrypted: "encrypted-access",
			spotifyRefreshTokenEncrypted: "encrypted-refresh",
		};
		findSessionByCodeMock.mockResolvedValue(session);
		prismaMock.guest.findMany.mockResolvedValue([]);
		prismaMock.queueEntry.findMany.mockResolvedValue([]);

		getPlaybackStateMock.mockResolvedValueOnce({ state: true });
		mapPlaybackStateMock.mockReturnValueOnce({
			isPlaying: true,
			trackInfos: { spotifyTrackId: "track-9" },
			progressMs: 2000,
			timestamp: 1,
		});
		const first = await getSessionSnapshot("333333");
		expect(first.playback).toMatchObject({ isPlaying: true });

		getPlaybackStateMock.mockResolvedValueOnce(null);
		const second = await getSessionSnapshot("333333");
		expect(second.playback).toMatchObject({
			isPlaying: false,
			trackInfos: { spotifyTrackId: "track-9" },
		});
	});

	it("pauses cached playback when spotify throws", async () => {
		const session = {
			id: 4,
			code: "444444",
			status: "Ready",
			settings: { autoApprove: true },
			spotifyDisplayName: "Host",
			spotifyAccessTokenEncrypted: "encrypted-access",
			spotifyRefreshTokenEncrypted: "encrypted-refresh",
		};
		findSessionByCodeMock.mockResolvedValue(session);
		prismaMock.guest.findMany.mockResolvedValue([]);
		prismaMock.queueEntry.findMany.mockResolvedValue([]);

		getPlaybackStateMock.mockResolvedValueOnce({ state: true });
		mapPlaybackStateMock.mockReturnValueOnce({
			isPlaying: true,
			trackInfos: { spotifyTrackId: "track-10" },
			progressMs: 2000,
			timestamp: 1,
		});
		const first = await getSessionSnapshot("444444");
		expect(first.playback).toMatchObject({ isPlaying: true });

		getPlaybackStateMock.mockRejectedValueOnce(new Error("Spotify down"));
		const second = await getSessionSnapshot("444444");
		expect(second.playback).toMatchObject({
			isPlaying: false,
			trackInfos: { spotifyTrackId: "track-10" },
		});
	});
});
