import type { Socket } from "node:net";
import { URL } from "node:url";
import crypto from "node:crypto";
import { getSessionSnapshot } from "./session/snapshot";
import { findSessionByCode } from "./session/find";
import { getSessionForHostReconnect } from "./session/host";
import { findGuestByToken } from "./guest/find";

type Client = {
	socket: Socket;
	code: string;
};

const clientsByCode = new Map<string, Set<Client>>();
const pollingByCode = new Map<string, ReturnType<typeof setInterval>>();

function encodeFrame(payload: string) {
	const data = Buffer.from(payload);
	const headerLength = data.length < 126 ? 2 : data.length < 65536 ? 4 : 10;
	const header = Buffer.alloc(headerLength);
	header[0] = 0x81;
	if (data.length < 126) {
		header[1] = data.length;
	} else if (data.length < 65536) {
		header[1] = 126;
		header.writeUInt16BE(data.length, 2);
	} else {
		header[1] = 127;
		header.writeBigUInt64BE(BigInt(data.length), 2);
	}
	return Buffer.concat([header, data]);
}

function send(client: Client, data: unknown) {
	if (client.socket.destroyed) return;
	client.socket.write(encodeFrame(JSON.stringify(data)));
}

function addClient(code: string, socket: Socket) {
	const client = { code, socket };
	let set = clientsByCode.get(code);
	if (!set) {
		set = new Set();
		clientsByCode.set(code, set);
	}
	set.add(client);
	startSessionPolling(code);
	const removeClient = () => {
		set?.delete(client);
		stopSessionPollingIfIdle(code);
	};
	socket.on("close", removeClient);
	socket.on("error", removeClient);
	return client;
}

export async function broadcastSessionSnapshot(code: string, event = "session.snapshot") {
	const snapshot = await getSessionSnapshot(code);
	const set = clientsByCode.get(code);
	if (!set) return snapshot;
	for (const client of set) {
		send(client, { event, payload: snapshot });
	}
	return snapshot;
}

function startSessionPolling(code: string) {
	if (pollingByCode.has(code)) return;
	const interval = setInterval(() => {
		void broadcastSessionSnapshot(code, "playback.updated").catch(() => {
		});
	}, 1000);
	pollingByCode.set(code, interval);
}

function stopSessionPollingIfIdle(code: string) {
	const set = clientsByCode.get(code);
	if (set?.size) return;
	clientsByCode.delete(code);
	const interval = pollingByCode.get(code);
	if (!interval) return;
	clearInterval(interval);
	pollingByCode.delete(code);
}

export async function handleWebSocketUpgrade(req: import("node:http").IncomingMessage, socket: Socket) {
	try {
		const host = req.headers.host ?? "localhost";
		const url = new URL(req.url ?? "", `http://${host}`);
		const match = url.pathname.match(/^\/session\/(\d{6})\/ws$/);
		if (!match) {
			socket.destroy();
			return;
		}
		const code = match[1];
		const role = url.searchParams.get("role");
		const token = url.searchParams.get("token") ?? "";
		const session = await findSessionByCode(code);
		if (!session) {
			socket.destroy();
			return;
		}
		if (role === "host") {
			await getSessionForHostReconnect(session.id, token);
		} else {
			const guest = await findGuestByToken(token);
			if (!guest || guest.sessionId !== session.id || guest.bannedAt) {
				socket.destroy();
				return;
			}
		}

		const key = req.headers["sec-websocket-key"];
		if (!key || Array.isArray(key)) {
			socket.destroy();
			return;
		}
		const accept = crypto
			.createHash("sha1")
			.update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
			.digest("base64");
		socket.write([
			"HTTP/1.1 101 Switching Protocols",
			"Upgrade: websocket",
			"Connection: Upgrade",
			`Sec-WebSocket-Accept: ${accept}`,
			"",
			"",
		].join("\r\n"));

		const client = addClient(code, socket);
		send(client, { event: "session.snapshot", payload: await getSessionSnapshot(code) });
	} catch {
		socket.destroy();
	}
}
