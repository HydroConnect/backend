import type { Request, Response } from "express";

import { Router } from "express";
import { summariesModel } from "../schemas/models/summaries.js";
import { readingsModel, type iReadings } from "../schemas/models/readings.js";
import { zIoTPayload, type iIoTPayload } from "../schemas/IoTPayload.js";
import { chemFormula } from "../lib/chemFormula.js";
import { validateIoT } from "../lib/validateIoT.js";
import { HttpError } from "../lib/errorHandler.js";
import { getIO } from "./io.js";
import { ZodError } from "zod";
import crypto from "crypto";
import { exec } from "child_process";

const restRouter = Router();
let summaryLastEntry: string | undefined = undefined;
let latestReading: iReadings | null = null; // Cache for latest reading

export function getMidnightDate(date: Date): Date {
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
        if (process.env.NODE_ENV !== "production") {
            summaryLastEntry = undefined;
            return;
        }
        summaryLastEntry = nowMidISO;
    }
}

restRouter.get("/summary", async (req: Request, res: Response) => {
    const earliestDate = getMidnightDate(new Date());
    earliestDate.setUTCDate(earliestDate.getDate() - 7);
    const summary = await summariesModel.find(
        { timestamp: { $gt: earliestDate } },
        { __v: 0, _id: 0 }
    );
    const output: any[] = [];

    let idx = summary.length - 1;
    for (let i = 0; i < 7; i++) {
        if (summary.length === 7) {
            output.push(summary[idx]!.toJSON());
            idx--;
        } else {
            let supposedDatetime = new Date();
            supposedDatetime.setUTCDate(supposedDatetime.getDate() - i);
            supposedDatetime = getMidnightDate(supposedDatetime);
            if (
                idx >= 0 &&
                summary[idx]!.timestamp.toISOString() === supposedDatetime.toISOString()
            ) {
                output.push(summary[idx]!.toJSON());
                idx--;
            } else {
                output.push({ timestamp: supposedDatetime, uptime: 0 });
            }
        }
    }

    // Output is already projected with _id and __v
    res.status(200).json(output);
});

restRouter.get("/latest", async (req: Request, res: Response) => {
    if (latestReading === null) {
        // @ts-expect-error This is the same type ase the reading thing
        latestReading = await readingsModel
            .findOne({}, { _id: 0, __v: 0 })
            .sort({ timestamp: "desc" });
    }
    res.status(200).json(latestReading);
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

        latestReading = payload;
        getIO().of("/io/v1").emit("readings", payload);
        await new readingsModel(payload).save();

        // Update Uptime
        await summariesModel.updateOne(
            {
                timestamp: summaryLastEntry
                    ? new Date(summaryLastEntry!)
                    : getMidnightDate(new Date()),
            },
            {
                $inc: { uptime: parseInt(process.env.IOT_INTERVAL_MS!) / 1000 },
            }
        );

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

restRouter.post("/github-webhook", (req: Request, res: Response) => {
    // Validate Payload
    const expectedHex = crypto
        .createHmac("sha256", Buffer.from(process.env.GITHUB_WEBHOOK_SECRET!, "utf8"))
        // @ts-expect-error This access the rawBody we define in our middleware
        .update(Buffer.from(req.rawBody, "utf8"))
        .digest("hex");

    // Convert both to Buffers
    const expected = Buffer.from(expectedHex, "hex");
    const nowHeader = req.header("X-Hub-Signature-256");
    if (nowHeader) {
        const received = Buffer.from(nowHeader.split("sha256=")[1]!, "hex");

        // Must be same length or timingSafeEqual throws
        if (expected.length === received.length) {
            if (
                crypto.timingSafeEqual(expected, received) &&
                req.body.repository.full_name === "HydroConnect/backend"
            ) {
                res.status(200).json(true);
                console.log(`At ${Date.now()} Updating Codebase!`);
                if (process.env.NODE_ENV === "production" && process.env.IS_LINUX === "true") {
                    // Watch out this could be DANGEROUS!!!
                    exec("sudo systemctl restart hydroconnect");
                }
                return;
            }
        }
    }

    res.status(403).json("Unauthorized");
});

export { restRouter };
