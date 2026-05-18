import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const getSessionSnapshotMock = jest.fn(async () => ({ session: { code: "123456" } }));
const findSessionByCodeMock = jest.fn(async () => null);
const getSessionForHostReconnectMock = jest.fn(async () => ({ id: 1 }));
const findGuestByTokenMock = jest.fn(async () => null);

const createdSockets: MockWebSocket[] = [];
let lastServer: MockWebSocketServer | null = null;

class MockWebSocket {
	static OPEN = 1;
	readyState = MockWebSocket.OPEN;
	send = jest.fn();
	private handlers = new Map<string, () => void>();
	on = jest.fn((event: string, handler: () => void) => {
		this.handlers.set(event, handler);
	});
	__trigger(event: string) {
		this.handlers.get(event)?.();
	}
}

class MockWebSocketServer {
	handleUpgrade = jest.fn((req: unknown, socket: unknown, head: unknown, cb: (ws: MockWebSocket) => void) => {
		const ws = new MockWebSocket();
		createdSockets.push(ws);
		cb(ws);
	});
	constructor() {
		lastServer = this;
	}
}

jest.unstable_mockModule("ws", () => ({
	WebSocket: MockWebSocket,
	WebSocketServer: MockWebSocketServer,
	__getCreatedSockets: () => createdSockets,
	__getLastServer: () => lastServer,
}));

jest.unstable_mockModule("./session/snapshot", () => ({
	getSessionSnapshot: getSessionSnapshotMock,
}));

jest.unstable_mockModule("./session/find", () => ({
	findSessionByCode: findSessionByCodeMock,
}));

jest.unstable_mockModule("./session/host", () => ({
	getSessionForHostReconnect: getSessionForHostReconnectMock,
}));

jest.unstable_mockModule("./guest/find", () => ({
	findGuestByToken: findGuestByTokenMock,
}));

const { broadcastSessionSnapshot, handleWebSocketUpgrade } = await import("./realtime");
const wsModule = await import("ws");

describe("realtime websocket helpers", () => {
	beforeEach(() => {
		getSessionSnapshotMock.mockReset();
		getSessionSnapshotMock.mockResolvedValue({ session: { code: "123456" } });
		findSessionByCodeMock.mockReset();
		getSessionForHostReconnectMock.mockReset();
		findGuestByTokenMock.mockReset();
		createdSockets.length = 0;
	});

	it("rejects invalid websocket paths", async () => {
		const socket = { destroy: jest.fn() };
		await handleWebSocketUpgrade(
			{ headers: { host: "localhost" }, url: "/bad/path" } as never,
			socket as never,
			Buffer.from(""),
		);
		expect(socket.destroy).toHaveBeenCalled();
		const server = wsModule.__getLastServer();
		expect(server?.handleUpgrade).not.toHaveBeenCalled();
	});

	it("returns snapshot when no clients are connected", async () => {
		getSessionSnapshotMock.mockResolvedValueOnce({ session: { code: "000000" } });
		const snapshot = await broadcastSessionSnapshot("000000");
		expect(snapshot).toEqual({ session: { code: "000000" } });
	});

	it("upgrades host websocket and sends initial snapshot", async () => {
		findSessionByCodeMock.mockResolvedValueOnce({ id: 1, code: "123456" });
		getSessionForHostReconnectMock.mockResolvedValueOnce({ id: 1 });
		const socket = { destroy: jest.fn() };
		await handleWebSocketUpgrade(
			{
				headers: { host: "localhost" },
				url: "/session/123456/ws?role=host&token=host-token",
			} as never,
			socket as never,
			Buffer.from(""),
		);

		await new Promise((resolve) => setImmediate(resolve));

		const server = wsModule.__getLastServer();
		expect(server?.handleUpgrade).toHaveBeenCalled();
		expect(createdSockets[0]?.send).toHaveBeenCalledWith(
			JSON.stringify({ event: "session.snapshot", payload: { session: { code: "123456" } } }),
		);

		createdSockets[0]?.__trigger("close");
	});

	it("destroys socket for invalid guest token", async () => {
		findSessionByCodeMock.mockResolvedValueOnce({ id: 2, code: "654321" });
		findGuestByTokenMock.mockResolvedValueOnce(null);
		const socket = { destroy: jest.fn() };
		await handleWebSocketUpgrade(
			{
				headers: { host: "localhost" },
				url: "/session/654321/ws?role=guest&token=bad",
			} as never,
			socket as never,
			Buffer.from(""),
		);
		expect(socket.destroy).toHaveBeenCalled();
	});

	it("destroys socket when session is missing", async () => {
		findSessionByCodeMock.mockResolvedValueOnce(null);
		const socket = { destroy: jest.fn() };
		await handleWebSocketUpgrade(
			{
				headers: { host: "localhost" },
				url: "/session/999999/ws?role=host&token=token",
			} as never,
			socket as never,
			Buffer.from(""),
		);
		expect(socket.destroy).toHaveBeenCalled();
	});

	it("upgrades guest websocket when token is valid", async () => {
		findSessionByCodeMock.mockResolvedValueOnce({ id: 5, code: "555555" });
		findGuestByTokenMock.mockResolvedValueOnce({
			id: 1,
			sessionId: 5,
			bannedAt: null,
		});
		const socket = { destroy: jest.fn() };
		await handleWebSocketUpgrade(
			{
				headers: { host: "localhost" },
				url: "/session/555555/ws?role=guest&token=guest-token",
			} as never,
			socket as never,
			Buffer.from(""),
		);
		await new Promise((resolve) => setImmediate(resolve));
		const server = wsModule.__getLastServer();
		expect(server?.handleUpgrade).toHaveBeenCalled();
		createdSockets[0]?.__trigger("close");
	});

	it("broadcastSessionSnapshot skips closed sockets", async () => {
		findSessionByCodeMock.mockResolvedValueOnce({ id: 3, code: "333333" });
		getSessionForHostReconnectMock.mockResolvedValueOnce({ id: 3 });
		await handleWebSocketUpgrade(
			{
				headers: { host: "localhost" },
				url: "/session/333333/ws?role=host&token=host-token",
			} as never,
			{ destroy: jest.fn() } as never,
			Buffer.from(""),
		);
		await new Promise((resolve) => setImmediate(resolve));

		const socket = createdSockets[0];
		socket.send.mockClear();
		socket.readyState = 0;
		await broadcastSessionSnapshot("333333", "custom.event");
		expect(socket.send).not.toHaveBeenCalled();
		socket.__trigger("close");
	});
});
