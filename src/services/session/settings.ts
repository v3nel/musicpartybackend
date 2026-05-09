import { sessionSettingsType } from "../../types/services/session/sessionSettings";

export type NormalizedSessionSettings = {
	autoApprove: boolean;
	allowDuplicates: boolean;
	maxTracksPerGuest: number;
	cooldownSeconds: number;
};

export const DEFAULT_SESSION_SETTINGS: NormalizedSessionSettings = {
	autoApprove: true,
	allowDuplicates: true,
	maxTracksPerGuest: 10,
	cooldownSeconds: 0,
};

export function normalizeSessionSettings(settings: unknown): NormalizedSessionSettings {
	const value = typeof settings === "object" && settings !== null ? settings as Record<string, unknown> : {};
	const legacyModeration = value.moderationEnabled;
	const legacyMax = value.maxTracksPerGuests;
	return {
		autoApprove: typeof value.autoApprove === "boolean"
			? value.autoApprove
			: typeof legacyModeration === "boolean"
				? !legacyModeration
				: DEFAULT_SESSION_SETTINGS.autoApprove,
		allowDuplicates: typeof value.allowDuplicates === "boolean"
			? value.allowDuplicates
			: DEFAULT_SESSION_SETTINGS.allowDuplicates,
		maxTracksPerGuest: Number.isFinite(Number(value.maxTracksPerGuest ?? legacyMax))
			? Math.max(0, Number(value.maxTracksPerGuest ?? legacyMax))
			: DEFAULT_SESSION_SETTINGS.maxTracksPerGuest,
		cooldownSeconds: Number.isFinite(Number(value.cooldownSeconds))
			? Math.max(0, Number(value.cooldownSeconds))
			: DEFAULT_SESSION_SETTINGS.cooldownSeconds,
	};
}
