import prisma from "../db/prisma";
import { SessionStatus } from "../prisma/generated/enums";
import { findSessionById } from "./find";
import { updateSpotifyTokensType } from "../../types/services/session/updateSpotifyTokens";
import { sessionSettingsType } from "../../types/services/session/sessionSettings";
import { normalizeSessionSettings } from "./settings";

export async function updateSessionStatus(session_id: number, status: SessionStatus) {
    const session = await findSessionById(session_id)
    if (session === null ) {
        throw new Error("Session with that id was not found")
    }
    const update = await prisma.session.update({
        where: { id: Number(session_id) },
        data: { status: status }
    })
    return update
}

export async function updateSessionSpotifyTokens(session_id: number, tokens: updateSpotifyTokensType) {
    const session = await prisma.session.findUnique({
        where: { id: Number(session_id) }
    })
    if (!session) {
        throw new Error("Session with that id was not found")
    }
    const update = await prisma.session.update({
        where: { id: Number(session_id) },
        data: { 
            spotifyAccessTokenEncrypted: tokens.access_token,
            spotifyRefreshTokenEncrypted: tokens.refresh_token,
            spotifyTokenExpiresAt: tokens.expires_at ?? Date.now() + 60 * 60 * 1000
        }
    })
    return update
}

export async function updateSessionSettings(session_id: number, settings: sessionSettingsType) {
    const session = await prisma.session.findUnique({
        where: { id: Number(session_id) }
    })
    if (!session) {
        throw new Error("Session with that id was not found")
    }
    const update = await prisma.session.update({
        where: { id: Number(session_id) },
            data: { settings: normalizeSessionSettings(settings) }
    })
    return update
}
