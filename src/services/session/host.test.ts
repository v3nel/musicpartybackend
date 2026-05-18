import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createHostToken } from "./hostToken";
import { SessionStatus } from "../prisma/generated/enums";

const prismaMock = {
	session: {
		update: jest.fn(async () => ({ id: 1 })),
	},
};

const findSessionByIdMock = jest.fn(async () => null);
const findGuestByTokenMock = jest.fn(async () => null);

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

jest.unstable_mockModule("./find", () => ({
	findSessionById: findSessionByIdMock,
}));

jest.unstable_mockModule("../guest/find", () => ({
	findGuestByToken: findGuestByTokenMock,
}));

const {
	getSessionForHostReconnect,
	markHostAsLeft,
	markHostAsSeen,
	requireHostOrCoHost,
} = await import("./host");

describe("getSessionForHostReconnect", () => {
	beforeEach(() => {
		findSessionByIdMock.mockReset();
	});

	it("throws when session does not exist", async () => {
		findSessionByIdMock.mockResolvedValueOnce(null);
		await expect(getSessionForHostReconnect(1, "token")).rejects.toThrow(
			"Session with that id was not found",
		);
	});

	it("throws when token is invalid", async () => {
		const { tokenHash } = createHostToken();
		findSessionByIdMock.mockResolvedValueOnce({
			id: 1,
			status: SessionStatus.Active,
			hostTokenHash: tokenHash,
		});
		await expect(
			getSessionForHostReconnect(1, "invalid-token"),
		).rejects.toThrow("Invalid host token");
	});

	it("throws when host token is missing", async () => {
		findSessionByIdMock.mockResolvedValueOnce({
			id: 1,
			status: SessionStatus.Active,
			hostTokenHash: null,
		});
		await expect(getSessionForHostReconnect(1, "token")).rejects.toThrow(
			"Host token is not set for this session",
		);
	});

	it("throws when session is closed", async () => {
		const { tokenHash } = createHostToken();
		findSessionByIdMock.mockResolvedValueOnce({
			id: 1,
			status: SessionStatus.Closed,
			hostTokenHash: tokenHash,
		});
		await expect(getSessionForHostReconnect(1, "token")).rejects.toThrow(
			"Session is closed",
		);
	});

	it("returns the session when token is valid", async () => {
		const hostToken = createHostToken();
		const session = {
			id: 1,
			status: SessionStatus.Active,
			hostTokenHash: hostToken.tokenHash,
		};
		findSessionByIdMock.mockResolvedValueOnce(session);

		await expect(
			getSessionForHostReconnect(1, hostToken.token),
		).resolves.toEqual(session);
	});
});

describe("markHostAsSeen", () => {
	beforeEach(() => {
		findSessionByIdMock.mockReset();
		prismaMock.session.update.mockReset();
		prismaMock.session.update.mockResolvedValue({ id: 5 });
	});

	it("throws when session does not exist", async () => {
		findSessionByIdMock.mockResolvedValueOnce(null);
		await expect(markHostAsSeen(5)).rejects.toThrow(
			"Session with that id was not found",
		);
	});

	it("updates host last seen", async () => {
		findSessionByIdMock.mockResolvedValueOnce({ id: 5 });
		await expect(markHostAsSeen(5)).resolves.toEqual({ id: 5 });
		expect(prismaMock.session.update).toHaveBeenCalledWith({
			where: { id: 5 },
			data: {
				hostLastSeenAt: expect.any(Date),
				hostLeftAt: null,
			},
		});
	});
});

describe("requireHostOrCoHost", () => {
	beforeEach(() => {
		findSessionByIdMock.mockReset();
		findGuestByTokenMock.mockReset();
	});

	it("returns host role when host token is valid", async () => {
		const hostToken = createHostToken();
		const session = {
			id: 10,
			status: SessionStatus.Active,
			hostTokenHash: hostToken.tokenHash,
		};
		findSessionByIdMock.mockResolvedValueOnce(session);
		await expect(
			requireHostOrCoHost(10, hostToken.token),
		).resolves.toEqual({ session, role: "host" });
	});

	it("throws when session is missing", async () => {
		findSessionByIdMock.mockResolvedValueOnce(null);
		await expect(requireHostOrCoHost(10, "token")).rejects.toThrow(
			"Session with that id was not found",
		);
	});

	it("throws when session is closed", async () => {
		const session = {
			id: 10,
			status: SessionStatus.Closed,
			hostTokenHash: null,
		};
		findSessionByIdMock.mockResolvedValueOnce(session);
		await expect(requireHostOrCoHost(10, "token")).rejects.toThrow(
			"Session is closed",
		);
	});

	it("returns cohost role when guest is cohost", async () => {
		const session = {
			id: 11,
			status: SessionStatus.Active,
			hostTokenHash: null,
		};
		const guest = { id: 5, sessionId: 11, isCoHost: true, bannedAt: null };
		findSessionByIdMock.mockResolvedValueOnce(session);
		findGuestByTokenMock.mockResolvedValueOnce(guest);
		await expect(requireHostOrCoHost(11, "guest-token")).resolves.toEqual({
			session,
			role: "cohost",
			guest,
		});
	});

	it("throws when token is invalid", async () => {
		const session = {
			id: 12,
			status: SessionStatus.Active,
			hostTokenHash: null,
		};
		findSessionByIdMock.mockResolvedValueOnce(session);
		findGuestByTokenMock.mockResolvedValueOnce(null);
		await expect(requireHostOrCoHost(12, "bad-token")).rejects.toThrow(
			"Invalid token",
		);
	});
});

describe("markHostAsLeft", () => {
	beforeEach(() => {
		findSessionByIdMock.mockReset();
		prismaMock.session.update.mockReset();
		prismaMock.session.update.mockResolvedValue({ id: 7 });
	});

	it("throws when session does not exist", async () => {
		findSessionByIdMock.mockResolvedValueOnce(null);
		await expect(markHostAsLeft(7)).rejects.toThrow(
			"Session with that id was not found",
		);
	});

	it("updates host left time", async () => {
		findSessionByIdMock.mockResolvedValueOnce({ id: 7 });
		await expect(markHostAsLeft(7)).resolves.toEqual({ id: 7 });
		expect(prismaMock.session.update).toHaveBeenCalledWith({
			where: { id: 7 },
			data: { hostLeftAt: expect.any(Date) },
		});
	});
});
