import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

const connection = process.env.DATABASE_URL;
if (!connection) {
	throw new Error("DATABASE_URL is required to initialize Prisma.");
}

const adapter = new PrismaPg({ connectionString: connection });
const prisma = new PrismaClient({ adapter: adapter });

export default prisma;