import prisma from "../db/prisma";
import { hashGuestToken } from "./token";

export async function createGuest(session_id: number, displayName: string, tokenHash: string) {
    const session = await prisma.session.findUnique({
        where: { id: Number(session_id) }
    })
    if (!session) {
        throw new Error("Session with that id was not found")
    }
    const guest = await prisma.guest.create({
        data: {
            sessionId: session_id,
            displayName: displayName,
            tokenHash: tokenHash
        }
    })
    return guest
}

export async function ensureHostShadowGuest(session_id: number, hostToken: string, displayName: string | null) {
    const tokenHash = hashGuestToken(hostToken);
    const existing = await prisma.guest.findUnique({ where: { tokenHash } });
    if (existing) return existing;
    return prisma.guest.create({
        data: {
            sessionId: session_id,
            displayName: displayName ?? "Host",
            tokenHash,
            isHost: true,
        },
    });
}