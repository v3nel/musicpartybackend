import prisma from "../db/prisma";

export async function markGuestAsSeen(guest_id: number) {
    const guest = await prisma.guest.findUnique({
        where: { id: Number(guest_id) }
    })
    if (!guest) {
        throw new Error("Guest with that id was not found")
    }
    const mark = await prisma.guest.update({
        where: { id: Number(guest_id) },
        data: {
            lastSeenAt: new Date(Date.now())
        }
    })
    return mark
}

export async function markGuestAsLeft(guest_id: number) {
    const guest = await prisma.guest.findUnique({
        where: { id: Number(guest_id) }
    })
    if (!guest) {
        throw new Error("Guest with that id was not found")
    }
    const mark = await prisma.guest.update({
        where: { id: Number(guest_id) },
        data: {
            leftAt: new Date(Date.now())
        }
    })
    return mark
}

export async function banGuest(guest_id: number) {
    const guest = await prisma.guest.findUnique({
        where: { id: Number(guest_id) }
    })
    if (!guest) {
        throw new Error("Guest with that id was not found")
    }
    if (guest.isHost) {
        throw new Error("Cannot ban the host")
    }
    await prisma.queueEntry.deleteMany({
        where: { guestId: Number(guest_id) }
    })
    return prisma.guest.update({
        where: { id: Number(guest_id) },
        data: {
            bannedAt: new Date(),
            isCoHost: false
        }
    })
}

export async function setGuestCoHost(guest_id: number, isCoHost: boolean) {
    const guest = await prisma.guest.findUnique({
        where: { id: Number(guest_id) }
    })
    if (!guest) {
        throw new Error("Guest with that id was not found")
    }
    if (guest.isHost) {
        throw new Error("Cannot promote the host")
    }
    if (guest.bannedAt) {
        throw new Error("Cannot promote a banned guest")
    }
    return prisma.guest.update({
        where: { id: Number(guest_id) },
        data: { isCoHost }
    })
}
