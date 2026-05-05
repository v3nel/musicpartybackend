import { Router, Request, Response } from "express"

export const spotifyRouter = Router()

spotifyRouter.get("/login/", async (req: Request, res: Response) => {
    const client_id = process.env.SPOTIFY_CLIENT_ID
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI
    const scope = process.env.SPOTIFY_SCOPES

    try {
        if (!client_id || !redirect_uri || !scope) {
            throw new Error("client_id or redirect_uri or scope for spotify are not specified in environment variables")
        }
        
        const url = new URL("https://accounts.spotify.com/authorize")
        url.searchParams.set("client_id", client_id)
        url.searchParams.set("response_type", "code")
        url.searchParams.set("redirect_uri", redirect_uri)
        url.searchParams.set("show_dialog", "true")
        url.searchParams.set("scope", scope)

        res.redirect(url.toString())
    } catch(e) {
        res.status(500).json({
            code: 500,
            message: (e instanceof Error) ? e.message : "An unknown error occurred"
        })
    }
})