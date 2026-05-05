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