import { parseSpotifyResponse } from "./parseApi"
import { CodetoTokenSpotifyResponseBody } from "../../types/services/spotify/codeToTokenResponse"
import { Session } from "../prisma/generated/client"
import { decryptSpotifyToken, secureSpotifyToken } from "./secureToken"
import { updateSessionSpotifyTokens } from "../session/update"
import nodeCrypto from "node:crypto"

export async function buildSpotifyAuthURL(sessionId: number, returnTo?: string) {
    if (!process.env.SPOTIFY_CLIENT_ID || typeof process.env.SPOTIFY_CLIENT_ID !== 'string' || !process.env.SPOTIFY_SECRET_ID || typeof process.env.SPOTIFY_SECRET_ID !== 'string' || !process.env.SPOTIFY_REDIRECT_URI || typeof process.env.SPOTIFY_REDIRECT_URI !== 'string' || !process.env.SPOTIFY_SCOPES || typeof process.env.SPOTIFY_SCOPES !== 'string') {
        throw new Error("Missing env variables for spotify authentication")
    }

    const stateOauth = await createOAuthState(sessionId, returnTo)
    const url = new URL("https://accounts.spotify.com/authorize")
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
    const rawKey = nodeCrypto.createHash("sha256").update(encryptPhrase, "utf-8").digest()
    const key = await crypto.subtle.importKey('raw', rawKey, { name: "AES-GCM" }, false, ['encrypt', 'decrypt'])
    return key
}

async function encryptOAuthState(state: {sessionId: number, nonce: string, returnTo?: string}) {
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

async function createOAuthState(sessionId: number, returnTo?: string) {
    const nonce = crypto.randomUUID()
    const encryptedState = await encryptOAuthState({ sessionId, nonce, ...(returnTo && { returnTo }) })
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
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${authorizationToken}`
            }
        })
        const response = await parseSpotifyResponse<CodetoTokenSpotifyResponseBody>(request)
        return response
    } catch(err) {
        throw new Error("An error occurred while communicating with Spotify API")
    }
}

export async function refreshTokenIfNeeded(session: Session) {
    const {spotifyAccessTokenEncrypted, spotifyRefreshTokenEncrypted, spotifyTokenExpiresAt } = session
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const secretId = process.env.SPOTIFY_SECRET_ID
    const expiresAt = normalizeExpiresAt(spotifyTokenExpiresAt)
    if(!spotifyRefreshTokenEncrypted || typeof spotifyRefreshTokenEncrypted !== 'string' || !spotifyAccessTokenEncrypted || typeof spotifyAccessTokenEncrypted !== 'string' || expiresAt === null) {
        throw new Error("An error occured while retrieving spotify tokens")
    }
    if (!clientId || typeof clientId !== 'string' || !secretId || typeof secretId !== 'string') {
        throw new Error("Missing env variables for spotify authentication")
    }
    var refreshToken = await decryptSpotifyToken(spotifyRefreshTokenEncrypted)
    var accessToken = await decryptSpotifyToken(spotifyAccessTokenEncrypted)
    if (expiresAt <= Date.now()) {
       const url = new URL("https://accounts.spotify.com/api/token")
       const authorizationToken = Buffer.from(`${clientId}:${secretId}`, "utf-8").toString("base64")
       try {
            const request = await fetch(url, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authorizationToken}`
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            })
            const response = await parseSpotifyResponse<CodetoTokenSpotifyResponseBody>(request)
            const nextRefreshToken = response.refresh_token ?? refreshToken
            const encryptedRefreshToken = await secureSpotifyToken(nextRefreshToken)
            const encryptedAccessToken = await secureSpotifyToken(response.access_token)
            const nextExpiresAt = Date.now() + response.expires_in * 1000
            await updateSessionSpotifyTokens(session.id, {
                access_token: encryptedAccessToken, refresh_token: encryptedRefreshToken, expires_at: nextExpiresAt
            })
            return { access_token: response.access_token, refresh_token: nextRefreshToken, expires_at: nextExpiresAt}
       } catch(err) {
            throw new Error("An error occured while communicating with spotify API")
       }
    } else {
        return { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt}
    }
}

function normalizeExpiresAt(value: Session["spotifyTokenExpiresAt"]) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }
    if (typeof value === "bigint") {
        return Number(value)
    }
    return null
}
