import prisma from "../db/prisma";

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