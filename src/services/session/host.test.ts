import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createHostToken } from "./hostToken";
import { SessionStatus } from "../prisma/generated/enums";

const prismaMock = {
	session: {
		update: jest.fn(async () => ({ id: 1 })),
	},
};

const findSessionByIdMock = jest.fn(async () => null);

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

jest.unstable_mockModule("./find", () => ({
	findSessionById: findSessionByIdMock,
}));

const { getSessionForHostReconnect, markHostAsSeen } = await import("./host");

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
