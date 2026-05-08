import { createSessionType } from "../../types/services/session/createSession";
import { isCodeAvailable } from "./find";
import prisma from "../db/prisma";

export async function createSession(data: createSessionType) {
    const code = data.code;
    if (!code) {
        throw new Error("A 6-digit code is required to create a session.")
    };
    const codeAvailable = await isCodeAvailable(code);
    if (!codeAvailable) {
        throw new Error("Session with this code already exists. Please change for an other code.")
    }
    const create = await prisma.session.create({
        data: {
            code: code,
            status: "Spotify_Pending"
        }
    })
    return create
}