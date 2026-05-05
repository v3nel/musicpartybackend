import prisma from "../db/prisma";

export async function listQueueBySession(session_id: number) {
    const session = await prisma.session.findUnique({
        where: { id: Number(session_id) }
    })
    if (!session) {
        throw new Error("Session with this id was not found")
    }
    const queue = await prisma.queueEntry.findMany({
        where: { sessionId: Number(session_id) },
        orderBy: { queuedAt: "desc" }
    })
    return queue
}