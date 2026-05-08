import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	testMatch: ["**/*.test.ts"],
	collectCoverageFrom: [
		"src/services/**/*.ts",
		"!src/services/prisma/generated/**",
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov"],
	globals: {
		"ts-jest": {
			tsconfig: "tsconfig.json",
			useESM: true,
		},
	},
};

export default config;
