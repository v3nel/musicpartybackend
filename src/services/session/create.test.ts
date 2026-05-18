import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
	session: {
		findUnique: jest.fn(async () => null),
		create: jest.fn(),
	},
};

jest.unstable_mockModule("../db/prisma.ts", () => ({
	default: prismaMock,
}));

const { createSession } = await import("./create");

describe("createSession", () => {
	beforeEach(() => {
		prismaMock.session.findUnique.mockReset();
		prismaMock.session.findUnique.mockResolvedValue(null);
		prismaMock.session.create.mockReset();
		prismaMock.session.create.mockResolvedValue({ id: 1 });
	});

	it("throws when code is missing", async () => {
		const payload = {
			code: "",
			settings: {
				moderationEnabled: false,
				allowDuplicates: true,
				maxTracksPerGuests: 3,
				cooldownSeconds: 10,
			},
		};
		await expect(createSession(payload)).rejects.toThrow(
			"A 6-digit code is required to create a session.",
		);
		expect(prismaMock.session.findUnique).not.toHaveBeenCalled();
	});

	it("throws when code is already used", async () => {
		prismaMock.session.findUnique.mockResolvedValueOnce({ id: 5 });
		const payload = {
			code: "123456",
			settings: {
				moderationEnabled: false,
				allowDuplicates: true,
				maxTracksPerGuests: 3,
				cooldownSeconds: 10,
			},
		};
		await expect(createSession(payload)).rejects.toThrow(
			"Session with this code already exists. Please change for an other code.",
		);
	});

	it("creates a session when code is available", async () => {
		const payload = {
			code: "123456",
			settings: {
				moderationEnabled: true,
				allowDuplicates: false,
				maxTracksPerGuests: 5,
				cooldownSeconds: 30,
			},
		};

		const expected = { id: 7, ...payload };
		prismaMock.session.create.mockResolvedValueOnce(expected);
		const result = await createSession(payload);
		expect(result.session).toEqual(expected);
		expect(result.hostToken).toEqual(expect.any(String));
		expect(prismaMock.session.findUnique).toHaveBeenCalledWith({
			where: { code: "123456" },
		});
		expect(prismaMock.session.create).toHaveBeenCalledWith({
			data: {
				code: "123456",
				status: "Spotify_Pending",
				settings: {
					autoApprove: false,
					allowDuplicates: false,
					maxTracksPerGuest: 5,
					cooldownSeconds: 30,
				},
				guests: {
					create: {
						displayName: "Host",
						tokenHash: expect.any(String),
						isHost: true,
					},
				},
				hostTokenHash: expect.any(String),
				hostTokenIssuedAt: expect.any(Date),
				hostLastSeenAt: expect.any(Date),
			},
		});
	});
});
