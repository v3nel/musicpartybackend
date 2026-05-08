import prisma from "../db/prisma";
import { SessionStatus } from "../prisma/generated/enums";
import { findSessionById } from "./find";
import { updateSpotifyTokensType } from "../../types/services/session/updateSpotifyTokens";
import { sessionSettingsType } from "../../types/services/session/sessionSettings";

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
    const expiresAtMs = normalizeExpiresAt(tokens.expires_at)
    const update = await prisma.session.update({
        where: { id: Number(session_id) },
        data: { 
            spotifyAccessTokenEncrypted: tokens.access_token,
            spotifyRefreshTokenEncrypted: tokens.refresh_token,
            spotifyTokenExpiresAt: new Date(expiresAtMs)
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
        data: { settings: settings }
    })
    return update
}

function normalizeExpiresAt(expiresAt: number): number {
    if (!Number.isFinite(expiresAt)) {
        throw new Error("expires_at must be a valid timestamp")
    }
    return expiresAt < 1_000_000_000_000 ? expiresAt * 1000 : expiresAt
}