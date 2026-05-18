import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	session: {
		update: jest.fn(async () => ({ id: 1 })),
	},
};

const secureSpotifyTokenMock = jest.fn(async (value: string) => `encrypted:${value}`);

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

jest.unstable_mockModule("./secureToken", () => ({
	secureSpotifyToken: secureSpotifyTokenMock,
}));

const { linkSpotifyAccountToSession } = await import("./session");

describe("linkSpotifyAccountToSession", () => {
	beforeEach(() => {
		prismaMock.session.update.mockReset();
		secureSpotifyTokenMock.mockReset();
		secureSpotifyTokenMock.mockImplementation(async (value: string) => `encrypted:${value}`);
	});

	it("updates session with encrypted tokens and profile", async () => {
		prismaMock.session.update.mockResolvedValueOnce({ id: 7 });
		const tokens = {
			access_token: "access",
			refresh_token: "refresh",
			expires_at: 1234,
		};
		const profile = { id: "spotify-user", display_name: "Host" };

		await expect(linkSpotifyAccountToSession(7, tokens, profile)).resolves.toEqual({
			id: 7,
		});
		expect(secureSpotifyTokenMock).toHaveBeenCalledWith("access");
		expect(secureSpotifyTokenMock).toHaveBeenCalledWith("refresh");
		expect(prismaMock.session.update).toHaveBeenCalledWith({
			where: { id: 7 },
			data: {
				status: "Ready",
				spotifyUserId: "spotify-user",
				spotifyDisplayName: "Host",
				spotifyAccessTokenEncrypted: "encrypted:access",
				spotifyRefreshTokenEncrypted: "encrypted:refresh",
				spotifyTokenExpiresAt: 1234,
			},
		});
	});
});
