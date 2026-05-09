import prisma from "../db/prisma";
import { findSessionById } from "./find";
import { verifyHostToken } from "./hostToken";
import { SessionStatus } from "../prisma/generated/enums";
import { findGuestByToken } from "../guest/find";

export async function getSessionForHostReconnect(
	session_id: number,
	hostToken: string,
) {
	const session = await findSessionById(session_id);
	if (!session) {
		throw new Error("Session with that id was not found");
	}
	if (!session.hostTokenHash) {
		throw new Error("Host token is not set for this session");
	}
	if (session.status === SessionStatus.Closed) {
		throw new Error("Session is closed");
	}
	const isValid = verifyHostToken(hostToken, session.hostTokenHash);
	if (!isValid) {
		throw new Error("Invalid host token");
	}
	return session;
}

export async function requireHostOrCoHost(
	session_id: number,
	token: string,
) {
	const session = await findSessionById(session_id);
	if (!session) {
		throw new Error("Session with that id was not found");
	}
	if (session.status === SessionStatus.Closed) {
		throw new Error("Session is closed");
	}
	if (session.hostTokenHash && verifyHostToken(token, session.hostTokenHash)) {
		return { session, role: "host" as const };
	}
	const guest = await findGuestByToken(token);
	if (guest && guest.sessionId === session.id && !guest.bannedAt && guest.isCoHost) {
		return { session, role: "cohost" as const, guest };
	}
	throw new Error("Invalid token");
}

export async function markHostAsSeen(session_id: number) {
	const session = await findSessionById(session_id);
	if (!session) {
		throw new Error("Session with that id was not found");
	}
	return prisma.session.update({
		where: { id: Number(session_id) },
		data: {
			hostLastSeenAt: new Date(),
			hostLeftAt: null,
		},
	});
}

export async function markHostAsLeft(session_id: number) {
	const session = await findSessionById(session_id);
	if (!session) {
		throw new Error("Session with that id was not found");
	}
	return prisma.session.update({
		where: { id: Number(session_id) },
		data: {
			hostLeftAt: new Date(),
		},
	});
}
