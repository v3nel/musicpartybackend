import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	session: {
		findUnique: jest.fn(async () => null),
	},
	guest: {
		findUnique: jest.fn(async () => null),
	},
	queueEntry: {
		findFirst: jest.fn(async () => null),
		count: jest.fn(async () => 0),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { validateQueueRequest } = await import("./rules");

type Session = {
	id: number;
	status: string;
	settings: Record<string, unknown>;
};

type Guest = {
	id: number;
	sessionId: number;
	bannedAt: Date | null;
	isHost: boolean;
};

const track = {
	trackUri: "spotify:track:123",
	spotifyTrackId: "123",
	title: "Song",
	artists: ["Artist"],
	albumImageUrl: "",
	durationMs: 123000,
};

describe("validateQueueRequest", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
		prismaMock.guest.findUnique.mockReset();
		prismaMock.queueEntry.findFirst.mockReset();
		prismaMock.queueEntry.count.mockReset();
	});

	it("throws when session is missing", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce(null);
		prismaMock.guest.findUnique.mockResolvedValueOnce(null);
		await expect(validateQueueRequest(1, 2, track)).rejects.toThrow(
			"Session with that id was not found",
		);
	});

	it("throws when guest is missing or wrong session", async () => {
		const session: Session = { id: 1, status: "Ready", settings: {} };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce({
			id: 2,
			sessionId: 999,
			bannedAt: null,
			isHost: false,
		});
		await expect(validateQueueRequest(1, 2, track)).rejects.toThrow(
			"Guest with that id was not found",
		);
	});

	it("throws when guest is banned", async () => {
		const session: Session = { id: 1, status: "Ready", settings: {} };
		const guest: Guest = { id: 2, sessionId: 1, bannedAt: new Date(), isHost: false };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce(guest);
		await expect(validateQueueRequest(1, 2, track)).rejects.toThrow(
			"This guest is banned from the session",
		);
	});

	it("throws when session is not ready", async () => {
		const session: Session = { id: 1, status: "Closed", settings: {} };
		const guest: Guest = { id: 2, sessionId: 1, bannedAt: null, isHost: false };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce(guest);
		await expect(validateQueueRequest(1, 2, track)).rejects.toThrow(
			"Session is not ready for queue updates",
		);
	});

	it("throws when track payload is incomplete", async () => {
		const session: Session = { id: 1, status: "Ready", settings: {} };
		const guest: Guest = { id: 2, sessionId: 1, bannedAt: null, isHost: false };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce(guest);
		await expect(
			validateQueueRequest(1, 2, { ...track, trackUri: "" }),
		).rejects.toThrow("Track payload is incomplete");
	});

	it("throws when duplicate is found and duplicates disabled", async () => {
		const session: Session = {
			id: 1,
			status: "Ready",
			settings: { allowDuplicates: false },
		};
		const guest: Guest = { id: 2, sessionId: 1, bannedAt: null, isHost: false };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce(guest);
		prismaMock.queueEntry.findFirst.mockResolvedValueOnce({ id: 5 });
		await expect(validateQueueRequest(1, 2, track)).rejects.toThrow(
			"This track is already in the queue",
		);
	});

	it("throws when guest reached max tracks", async () => {
		const session: Session = {
			id: 1,
			status: "Ready",
			settings: { maxTracksPerGuest: 1 },
		};
		const guest: Guest = { id: 2, sessionId: 1, bannedAt: null, isHost: false };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce(guest);
		prismaMock.queueEntry.count.mockResolvedValueOnce(1);
		await expect(validateQueueRequest(1, 2, track)).rejects.toThrow(
			"This guest reached the queue limit",
		);
	});

	it("throws when guest is in cooldown", async () => {
		const session: Session = {
			id: 1,
			status: "Ready",
			settings: { cooldownSeconds: 60 },
		};
		const guest: Guest = { id: 2, sessionId: 1, bannedAt: null, isHost: false };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce(guest);
		const now = new Date("2026-05-18T10:00:00.000Z");
		const latest = { requestedAt: new Date("2026-05-18T09:59:30.000Z") };
		prismaMock.queueEntry.findFirst.mockResolvedValueOnce(latest);
		const dateSpy = jest.spyOn(Date, "now").mockReturnValueOnce(now.getTime());
		await expect(validateQueueRequest(1, 2, track)).rejects.toThrow(
			"Please wait before adding another track",
		);
		dateSpy.mockRestore();
	});

	it("returns session and guest when valid", async () => {
		const session: Session = {
			id: 1,
			status: "Ready",
			settings: { allowDuplicates: true, maxTracksPerGuest: 0 },
		};
		const guest: Guest = { id: 2, sessionId: 1, bannedAt: null, isHost: false };
		prismaMock.session.findUnique.mockResolvedValueOnce(session);
		prismaMock.guest.findUnique.mockResolvedValueOnce(guest);
		const result = await validateQueueRequest(1, 2, track);
		expect(result.session).toEqual(session);
		expect(result.guest).toEqual(guest);
		expect(result.settings).toEqual(expect.objectContaining({
			allowDuplicates: true,
		}));
	});
});
