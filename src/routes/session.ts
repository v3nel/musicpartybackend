import { Router, Request, Response } from "express";
import { isCodeAvailable } from "../services/session/find";
import { createSession } from "../services/session/create";
import { createSessionType } from "../types/services/session/createSession";
const sessionRouter = Router();

/**
 * @swagger
 * /session/iscodeavailable:
 *  post:
 *      summary: Check if a session code is available
 *      description: Set a code in the params of the request and this endpoint will check if this session code is available for use.
 *      parameters:
 *          - name: code
 *            description: The code to submit for checking
 *            required: true
 *            type: string
 *      responses:
 *          200:
 *              description: Returns a boolean whether it is available or not
 *          400:
 *              description: If no code has been furnished
 *          500:
 *              description: Internal Server Error
 */
sessionRouter.get("/iscodeavailable", async (req: Request, res: Response) => {
    const code = req.query.code;

    if (!code || typeof code !== "string") {
        return res.status(400).json({
            code: 400,
            error: "No code was submitted for checking"
        });
    }

    try {
        const check = await isCodeAvailable(code);
        return res.status(200).send(!!check);
    } catch (err) {
        return res.status(500).json({ code: 500, error: "Internal server error" });
    }
});

sessionRouter.post("/", async (req: Request, res: Response) => {
    const { settings, sessionId } = req.body;

    if (!settings || typeof settings !== "object" || !sessionId || typeof sessionId !== "number") {
        return res.status(400).json({
            code: 400,
            error: "No settings were submitted"
        });
    }

    
    
})

sessionRouter.post("/reserve-code", async (req: Request, res: Response) => {
    const code = req.params.code;

    if (!code || typeof code !== "string") {
        return res.status(400).json({
            code: 400,
            error: "No code was submitted"
        })
    }

    try {
        const reserve = await createSession({
            code: code
        })
        return res.status(201).json({
            code: 201,
            message: "The code was reserved with success",
            session_id: reserve.id,
            session_code: reserve.code,
            status: reserve.status
        })
    } catch (err) {
        return res.status(500).json({
            code: 500,
            error: "Internal Server Error"
        })
    }
})

export default sessionRouter;