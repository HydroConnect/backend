import type { Request, Response } from "express";

import { Router } from "express";
import { summariesModel } from "../schemas/models/summaries.js";
import { filterMongo } from "../lib/filterMongo.js";
import { readingsModel, type iReadings } from "../schemas/models/readings.js";
import { zIoTPayload, type iIoTPayload } from "../schemas/IoTPayload.js";
import { chemFormula } from "../lib/chemFormula.js";
import { validateIoT } from "../lib/validateIoT.js";
import { HttpError } from "../lib/errorHandler.js";
import { getIO } from "./io.js";
import { ZodError } from "zod";

const restRouter = Router();

restRouter.get("/summary", async (req: Request, res: Response) => {
    const summary = await summariesModel.find().limit(7);
    res.status(200).json(filterMongo(summary));
});

restRouter.get("/latest", async (req: Request, res: Response) => {
    const reading = await readingsModel.findOne().sort({ timestamp: "desc" });
    res.status(200).json(filterMongo(reading));
});

restRouter.post("/readings", async (req: Request, res: Response) => {
    try {
        req.body = zIoTPayload.parse(req.body);
        if (!validateIoT(req.body as iIoTPayload)) {
            throw new HttpError(403);
        }

        const payload: iReadings = {
            ...(req.body as iIoTPayload).readings,
            timestamp: new Date(Date.now()).toISOString(),
            percent: chemFormula((req.body as iIoTPayload).readings),
        };

        getIO().of("/io/v1").emit("readings", payload);
        await new readingsModel(payload).save();

        res.status(200).json(true);
    } catch (err) {
        if (err instanceof ZodError) {
            throw new HttpError(400);
        } else if (err instanceof HttpError) {
            throw err;
        }

        throw new HttpError(500);
    }
});

export { restRouter };
