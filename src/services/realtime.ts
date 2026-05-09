import type { Socket } from "node:net";
import type { IncomingMessage } from "node:http";
import { URL } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { getSessionSnapshot } from "./session/snapshot";
import { findSessionByCode } from "./session/find";
import { getSessionForHostReconnect } from "./session/host";
import { findGuestByToken } from "./guest/find";

type Client = {
	socket: WebSocket;
	code: string;
};

const wss = new WebSocketServer({ noServer: true });
const clientsByCode = new Map<string, Set<Client>>();
const pollingByCode = new Map<string, ReturnType<typeof setInterval>>();
const pollingInFlightByCode = new Set<string>();

function send(client: Client, data: unknown) {
	if (client.socket.readyState !== WebSocket.OPEN) return;
	client.socket.send(JSON.stringify(data));
}

function addClient(code: string, socket: WebSocket) {
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
		if (pollingInFlightByCode.has(code)) return;
		pollingInFlightByCode.add(code);
		void broadcastSessionSnapshot(code, "playback.updated")
			.catch(() => {})
			.finally(() => {
				pollingInFlightByCode.delete(code);
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
	pollingInFlightByCode.delete(code);
}

export async function handleWebSocketUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
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

		wss.handleUpgrade(req, socket, head, async (ws) => {
			const client = addClient(code, ws);
			try {
				const snapshot = await getSessionSnapshot(code);
				send(client, { event: "session.snapshot", payload: snapshot });
			} catch {
				// Initial snapshot is best-effort; polling will retry.
			}
		});
	} catch {
		socket.destroy();
	}
}
