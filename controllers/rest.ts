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
let summaryLastEntry: string | undefined = undefined;

function getMidnightDate(date: Date): Date {
    date.setUTCHours(0, 0, 0, 1);
    return date;
}

async function populateTodaySummary() {
    const nowMidnight = getMidnightDate(new Date());
    const nowMidISO = nowMidnight.toISOString();
    if (summaryLastEntry === nowMidISO) {
        return;
    }
    const summary = await summariesModel.findOne().sort({ timestamp: -1 });
    if (!summary || summary.timestamp.toISOString() !== nowMidISO) {
        // Add today's date
        await new summariesModel({
            uptime: 0,
            timestamp: nowMidnight,
        }).save();
        summaryLastEntry = nowMidISO;
    }
}

restRouter.get("/summary", async (req: Request, res: Response) => {
    await populateTodaySummary();
    const summary = await summariesModel.find().sort({ timestamp: -1 }).limit(7);
    res.status(200).json(filterMongo(summary));
});

restRouter.get("/latest", async (req: Request, res: Response) => {
    const reading = await readingsModel.findOne().sort({ timestamp: "desc" });
    res.status(200).json(filterMongo(reading));
});

restRouter.post("/readings", async (req: Request, res: Response) => {
    try {
        await populateTodaySummary();
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

        // Update Uptime
        const summary = await summariesModel.findOne().sort({ timestamp: -1 });
        summary!.uptime += 2;
        await summary!.save();

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
