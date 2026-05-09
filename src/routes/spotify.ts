import express, { Request, Response } from "express"
import { buildSpotifyAuthURL, decryptOAuthState, exchangeCodeforToken } from "../services/spotify/auth"
import { fetchSpotifyProfile } from "../services/spotify/user"
import { linkSpotifyAccountToSession } from "../services/spotify/session"
import { findSessionByCode } from "../services/session/find"

export const spotifyRouter = express.Router()

spotifyRouter.get("/login/", async (req: Request, res: Response) => {
    const sessionCode = typeof req.query.code === "string" ? req.query.code : ""
    const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined
    if (!/^\d{6}$/.test(sessionCode)) {
        return res.status(400).json({ code: 400, message: "session code is required" })
    }
    try {
        const session = await findSessionByCode(sessionCode)
        if (!session) {
            return res.status(404).json({ code: 404, message: "Session with that code was not found" })
        }
        const url = await buildSpotifyAuthURL(session.id, sanitizeReturnTo(returnTo))
        res.redirect(url.toString())
    } catch(e) {
        res.status(500).json({
            code: 500,
            message: (e instanceof Error) ? e.message : "An unknown error occurred"
        })
    }
})

spotifyRouter.get("/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : ""
    const state = typeof req.query.state === "string" ? req.query.state : ""
    if (!code || !state) {
        return res.status(400).json({ code: 400, message: "code and state are required" })
    }
    try {
        const oauthState = await decryptOAuthState(state)
        const tokenResponse = await exchangeCodeforToken(code)
        if (!tokenResponse.refresh_token) {
            return res.status(502).json({
                code: 502,
                message: "Spotify did not return a refresh token for this session"
            })
        }
        const profile = await fetchSpotifyProfile(tokenResponse.access_token)
        const session = await linkSpotifyAccountToSession(Number(oauthState.sessionId), {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: Date.now() + tokenResponse.expires_in * 1000
        }, profile)
        const frontendUrl = sanitizeReturnTo(oauthState.returnTo) ?? process.env.FRONTEND_URL ?? "http://localhost:3000"
        res.redirect(`${frontendUrl}/session/${session.code}`)
    } catch(e) {
        res.status(500).json({
            code: 500,
            message: (e instanceof Error) ? e.message : "An unknown error occurred"
        })
    }
})

function sanitizeReturnTo(returnTo: unknown) {
    if (!returnTo || typeof returnTo !== "string") return undefined
    try {
        const url = new URL(returnTo)
        if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
        return url.origin
    } catch {
        return undefined
    }
}
