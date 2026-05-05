import "dotenv/config";
import net from "node:net";
const waitMs = Number(process.env.PRISMA_DEV_WAIT_MS ?? "15000");
const dockerService = process.env.POSTGRES_SERVICE ?? "db";
const skipDocker = process.env.PRISMA_DEV_SKIP_DOCKER === "1";
const databaseUrl = process.env.DATABASE_URL;
const bunExecutable = process.execPath || "bun";

try {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required in .env for dev DB.");
  }

  if (!skipDocker) {
    await runCommand(["docker", "compose", "up", "-d", dockerService]);
  }

  const { host, port } = parseHostPort(databaseUrl);
  await waitForPort(host, port, waitMs);
  await waitForDatabaseReady(databaseUrl, waitMs);

  console.log(`Dev DB ready at ${host}:${port}.`);

  await runCommand([bunExecutable, "x", "prisma", "migrate", "dev"], {
    ...process.env,
    DATABASE_URL: databaseUrl,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

async function runCommand(cmd: string[], env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const proc = Bun.spawn({
    cmd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env,
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode ?? 1);
  }
}

function parseHostPort(urlString: string): { host: string; port: number } {
  const url = new URL(urlString);
  const host = url.hostname || "localhost";
  const port = Number(url.port || "5432");
  return { host, port };
}

async function waitForPort(host: string, port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await tryConnect(host, port);
    if (ready) {
      return;
    }

    await delay(200);
  }

  throw new Error(`Timed out waiting for ${host}:${port}`);
}

function tryConnect(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForDatabaseReady(databaseUrl: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  const env = { ...process.env, DATABASE_URL: databaseUrl };

  while (Date.now() - start < timeoutMs) {
    const exitCode = await runCommandWithInput(
      [bunExecutable, "x", "prisma", "db", "execute", "--stdin"],
      "SELECT 1;",
      env
    );

    if (exitCode === 0) {
      return;
    }

    await delay(400);
  }

  throw new Error("Timed out waiting for Prisma dev database readiness.");
}


async function runCommandWithInput(
  cmd: string[],
  input: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<number> {
  const proc = Bun.spawn({
    cmd,
    stdout: "ignore",
    stderr: "ignore",
    stdin: "pipe",
    env,
  });

  proc.stdin.write(input);
  proc.stdin.end();

  const exitCode = await proc.exited;
  return exitCode ?? 1;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
