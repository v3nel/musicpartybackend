import prisma from "../db/prisma"

export async function findGuestById(guest_id: number) {
    const guest = await prisma.guest.findUnique({
        where: { id: Number(guest_id) }
    })
    return guest
}

export async function findGuestByToken(guest_token: String) {
    const guest = await prisma.guest.findUnique({
        where: { tokenHash: String(guest_token) }
    })
    return guest
}