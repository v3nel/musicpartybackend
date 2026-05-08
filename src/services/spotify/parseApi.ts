import { SpotifyApiError } from "../../types/services/spotify/apiError";

export function isSpotifyApiError(payload: unknown): payload is SpotifyApiError {
	if (!payload || typeof payload !== `object` || !(`error` in payload)) {
		return false;
	}

	const maybeError = (payload as { error?: unknown }).error;
	return Boolean(maybeError && typeof maybeError === `object`);
}

export async function parseSpotifyResponse<T>(response: Response): Promise<T> {
	const payload = await response.json() as unknown;

	if (isSpotifyApiError(payload)) {
		const message = payload.error.message ?? `Unknown Spotify API error`;
		const status = payload.error.status ? ` (${payload.error.status})` : ``;
		throw new Error(`${message}${status}`);
	}

	return payload as T;
}
