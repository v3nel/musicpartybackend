import { createSessionType } from "../../types/services/session/createSession";
import { isCodeAvailable } from "./find";
import prisma from "../db/prisma";
import { createHostToken } from "./hostToken";
import { hashGuestToken } from "../guest/token";
import { normalizeSessionSettings } from "./settings";

export async function createSession(data: createSessionType) {
    const code = data.code;
    if (!code) {
        throw new Error("A 6-digit code is required to create a session.")
    };
    const codeAvailable = await isCodeAvailable(code);
    if (!codeAvailable) {
        throw new Error("Session with this code already exists. Please change for an other code.")
    }
    const hostToken = createHostToken();
    const create = await prisma.session.create({
        data: {
            code: code,
            status: "Spotify_Pending",
            settings: normalizeSessionSettings(data.settings),
            hostTokenHash: hostToken.tokenHash,
            hostTokenIssuedAt: hostToken.issuedAt,
            hostLastSeenAt: hostToken.issuedAt,
            guests: {
                create: {
                    displayName: "Host",
                    tokenHash: hashGuestToken(hostToken.token),
                    isHost: true,
                },
            },
        }
    })
    return { session: create, hostToken: hostToken.token }
}
