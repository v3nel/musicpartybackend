import prisma from "../db/prisma";
import { findQueueEntryById } from "./find";

export async function markQueueEntryQueued(queueEntryId: number) {
    const queueEntry = await findQueueEntryById(queueEntryId)
    if (queueEntry === null ) {
        throw new Error("QueueEntry with that id was not found")
    }
    const update = await prisma.queueEntry.update({
        where: { id: Number(queueEntry) },
        data: { status: "Queued" }
    })
    return update
}

export async function markQueueEntryRejected(queueEntryId: number) {
    const queueEntry = await findQueueEntryById(queueEntryId)
    if (queueEntry === null) {
        throw new Error("QueueEntry with that id was not found")
    }
    const update = await prisma.queueEntry.update({
        where: { id: Number(queueEntryId) },
        data: { status: "Rejected" }
    })
    return update
}

export async function markQueueEntryFailed(queueEntryId: number, failureReason: string) {
    const queueEntry = await findQueueEntryById(queueEntryId)
    if (queueEntry === null) {
        throw new Error("QueueEntry with that id was not found")
    }
    const update = await prisma.queueEntry.update({
        where: { id: Number(queueEntryId) },
        data: { status: "Failed" , failureReason: failureReason }
    })
    return update
}