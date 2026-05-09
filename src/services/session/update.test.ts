import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { SessionStatus } from "../prisma/generated/enums";

const prismaMock = {
	session: {
		findUnique: jest.fn(async () => null),
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

const {
	updateSessionStatus,
	updateSessionSpotifyTokens,
	updateSessionSettings,
} = await import("./update");

describe("updateSessionStatus", () => {
	beforeEach(() => {
		findSessionByIdMock.mockReset();
		prismaMock.session.update.mockReset();
	});

	it("throws when session does not exist", async () => {
		findSessionByIdMock.mockResolvedValueOnce(null);
		await expect(updateSessionStatus(3, SessionStatus.Ready)).rejects.toThrow(
			"Session with that id was not found",
		);
		expect(prismaMock.session.update).not.toHaveBeenCalled();
	});

	it("updates the session status", async () => {
		const expected = { id: 3, status: SessionStatus.Ready };
		findSessionByIdMock.mockResolvedValueOnce({ id: 3 });
		prismaMock.session.update.mockResolvedValueOnce(expected);

		await expect(updateSessionStatus(3, SessionStatus.Ready)).resolves.toEqual(
			expected,
		);
		expect(prismaMock.session.update).toHaveBeenCalledWith({
			where: { id: 3 },
			data: { status: SessionStatus.Ready },
		});
	});
});

describe("updateSessionSpotifyTokens", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
		prismaMock.session.update.mockReset();
	});

	it("throws when session does not exist", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce(null);
		await expect(
			updateSessionSpotifyTokens(2, {
				access_token: "access",
				refresh_token: "refresh",
			}),
		).rejects.toThrow("Session with that id was not found");
		expect(prismaMock.session.update).not.toHaveBeenCalled();
	});

	it("sets expires_at to one hour from now", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 2 });
		const expected = { id: 2 };
		prismaMock.session.update.mockResolvedValueOnce(expected);
		const now = 1_700_000_000_000;
		const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);
		await expect(
			updateSessionSpotifyTokens(2, {
				access_token: "access",
				refresh_token: "refresh",
			}),
		).resolves.toEqual(expected);
		nowSpy.mockRestore();

		expect(prismaMock.session.update).toHaveBeenCalledWith({
			where: { id: 2 },
			data: {
				spotifyAccessTokenEncrypted: "access",
				spotifyRefreshTokenEncrypted: "refresh",
				spotifyTokenExpiresAt: now + 60 * 60 * 1000,
			},
		});
	});
});

describe("updateSessionSettings", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
		prismaMock.session.update.mockReset();
	});

	it("throws when session does not exist", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce(null);
		await expect(
			updateSessionSettings(4, {
				moderationEnabled: false,
				allowDuplicates: true,
				maxTracksPerGuests: 3,
				cooldownSeconds: 10,
			}),
		).rejects.toThrow("Session with that id was not found");
	});

	it("updates the session settings", async () => {
		const settings = {
			moderationEnabled: true,
			allowDuplicates: false,
			maxTracksPerGuests: 2,
			cooldownSeconds: 15,
		};
		const expected = { id: 4, settings };
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 4 });
		prismaMock.session.update.mockResolvedValueOnce(expected);

		await expect(updateSessionSettings(4, settings)).resolves.toEqual(expected);
		expect(prismaMock.session.update).toHaveBeenCalledWith({
			where: { id: 4 },
			data: {
				settings: {
					autoApprove: false,
					allowDuplicates: false,
					maxTracksPerGuest: 2,
					cooldownSeconds: 15,
				},
			},
		});
	});
});
