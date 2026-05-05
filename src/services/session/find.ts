import prisma from "../db/prisma"

export async function findSessionByCode(code: string) {
    if (code.length !== 6) {
        throw new Error("The session code has to be 6 digits")
    }
    const session = await prisma.session.findUnique({
        where: { code: String(code) }
    })
    return session
}

export async function isCodeAvailable(code: string) {
    if (code.length !== 6) {
        throw new Error("The session code has to be 6 digits")
    }
    const session = await prisma.session.findUnique({
        where: { code: String(code) }
    })
    return session === null
}

export async function findSessionById(id: number) {
    const session = await prisma.session.findUnique({
        where: { id: Number(id) }
    })
    return session
}