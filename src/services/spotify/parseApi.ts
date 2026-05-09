import { SpotifyApiError } from "../../types/services/spotify/apiError";

export function isSpotifyApiError(payload: unknown): payload is SpotifyApiError {
	if (!payload || typeof payload !== `object` || !(`error` in payload)) {
		return false;
	}

	const maybeError = (payload as { error?: unknown }).error;
	return Boolean(maybeError && typeof maybeError === `object`);
}

export async function parseSpotifyResponse<T>(response: Response): Promise<T> {
	if (response.status === 204) {
		return null as T;
	}

	const text = await response.text();
	const payload = text ? JSON.parse(text) as unknown : null;

	if (isSpotifyApiError(payload)) {
		const message = payload.error.message ?? `Unknown Spotify API error`;
		const status = payload.error.status ? ` (${payload.error.status})` : ``;
		throw new Error(`${message}${status}`);
	}

	if (!response.ok) {
		throw new Error(`Spotify API error (${response.status})`);
	}

	return payload as T;
}
