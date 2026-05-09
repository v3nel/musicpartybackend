import prisma from "../db/prisma"
import { hashGuestToken } from "./token"

export async function findGuestById(guest_id: number) {
    const guest = await prisma.guest.findUnique({
        where: { id: Number(guest_id) }
    })
    return guest
}

export async function findGuestByToken(guest_token: string) {
    const guest = await prisma.guest.findUnique({
        where: { tokenHash: hashGuestToken(guest_token) }
    })
    return guest
}
