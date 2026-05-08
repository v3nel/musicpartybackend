import { parseSpotifyResponse } from "./parseApi"
import { CodetoTokenSpotifyResponseBody } from "../../types/services/spotify/codeToTokenResponse"

// Placeholder for Spotify service orchestration helpers.
export async function buildSpotifyAuthURL(sessionId: number) {
    if (!process.env.SPOTIFY_CLIENT_ID || typeof process.env.SPOTIFY_CLIENT_ID !== 'string' || !process.env.SPOTIFY_SECRET_ID || typeof process.env.SPOTIFY_SECRET_ID !== 'string' || !process.env.SPOTIFY_REDIRECT_URI || typeof process.env.SPOTIFY_REDIRECT_URI !== 'string' || !process.env.SPOTIFY_SCOPES || typeof process.env.SPOTIFY_SCOPES !== 'string') {
        throw new Error("Missing env variables for spotify authentication")
    }

    const stateOauth = await createOAuthState(sessionId)
    const url = new URL("https://account.spotify.com/authorize")
    url.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("redirect_uri", process.env.SPOTIFY_REDIRECT_URI)
    url.searchParams.set('state', stateOauth)
    url.searchParams.set('scope', process.env.SPOTIFY_SCOPES)
    url.searchParams.set('show_dialog', 'true')
    return url
}

async function getKey() {
    const encryptPhrase = process.env.SPOTIFY_STATE_ENCRYPTION_PHRASE
    if (!encryptPhrase || typeof encryptPhrase !== 'string') {
        throw new Error("Missing env variables for spotify authentication")
    }
    const rawKey = Buffer.from(encryptPhrase, 'utf-8')
    const key = await crypto.subtle.importKey('raw', rawKey, { name: "AES-GCM" }, false, ['encrypt', 'decrypt'])
    return key
}

async function encryptOAuthState(state: {sessionId: number, nonce: string}) {
    const key = await getKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encoded = new TextEncoder().encode(JSON.stringify(state))

    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)

    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.byteLength)

    return Buffer.from(combined).toString("base64url")
}

export async function decryptOAuthState(token: string) {
    const key = await getKey();
    const combined = Buffer.from(token, 'base64url');

    const iv = combined.subarray(0, 12);
    const ciphertext = combined.subarray(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
}

async function createOAuthState(sessionId: number) {
    const nonce = crypto.randomUUID()
    const encryptedState = await encryptOAuthState({ sessionId, nonce })
    return encryptedState
}

export async function exchangeCodeforToken(code: string) {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const secretId = process.env.SPOTIFY_SECRET_ID
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI
    if (!clientId || typeof clientId !== 'string' || !secretId || typeof secretId !== 'string' || !redirectUri || typeof redirectUri !== "string") {
        throw new Error("Missng env variables for spotify authentication")
    }
    const url = new URL("https://accounts.spotify.com/api/token")
    const authorizationToken = Buffer.from(`${clientId}:${secretId}`, "utf-8").toString("base64")
    try {
        const request = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri
            }),
            headers: {
                "Content-Type": "application/x-www-url-urlencoded",
                "Authorization": `Basic ${authorizationToken}`
            }
        })
        const response = await parseSpotifyResponse<CodetoTokenSpotifyResponseBody>(request)
        return response
    } catch(err) {
        throw new Error("An error occurred while communicating with Spotify API")
    }
}