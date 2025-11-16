import { Router } from "express";
import { summariesModel } from "../schemas/models/summaries.js";
import { readingsModel } from "../schemas/models/readings.js";
import { zIoTPayload } from "../schemas/IoTPayload.js";
import { chemFormula } from "../lib/chemFormula.js";
import { validateIoT } from "../lib/validateIoT.js";
import { HttpError } from "../lib/errorHandler.js";
import { getIO } from "./io.js";
import { ZodError } from "zod";
const restRouter = Router();
let summaryLastEntry = undefined;
export function getMidnightDate(date) {
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
restRouter.get("/summary", async (req, res) => {
    const earliestDate = getMidnightDate(new Date());
    earliestDate.setUTCDate(earliestDate.getDate() - 7);
    const summary = await summariesModel.find({ timestamp: { $gt: earliestDate } }, { __v: 0, _id: 0 });
    const output = [];
    let idx = summary.length - 1;
    for (let i = 0; i < 7; i++) {
        if (summary.length === 7) {
            output.push(summary[idx].toJSON());
            idx--;
        }
        else {
            let supposedDatetime = new Date();
            supposedDatetime.setUTCDate(supposedDatetime.getDate() - i);
            supposedDatetime = getMidnightDate(supposedDatetime);
            if (idx >= 0 &&
                summary[idx].timestamp.toISOString() === supposedDatetime.toISOString()) {
                output.push(summary[idx].toJSON());
                idx--;
            }
            else {
                output.push({ timestamp: supposedDatetime, uptime: 0 });
            }
        }
    }
    // Output is already projected with _id and __v
    res.status(200).json(output);
});
restRouter.get("/latest", async (req, res) => {
    const reading = await readingsModel.findOne({}, { _id: 0, __v: 0 }).sort({ timestamp: "desc" });
    res.status(200).json(reading);
});
restRouter.post("/readings", async (req, res) => {
    try {
        await populateTodaySummary();
        req.body = zIoTPayload.parse(req.body);
        if (!validateIoT(req.body)) {
            throw new HttpError(403);
        }
        const payload = {
            ...req.body.readings,
            timestamp: new Date(Date.now()).toISOString(),
            percent: chemFormula(req.body.readings),
        };
        getIO().of("/io/v1").emit("readings", payload);
        await new readingsModel(payload).save();
        // Update Uptime
        await summariesModel.updateOne({
            timestamp: summaryLastEntry
                ? new Date(summaryLastEntry)
                : getMidnightDate(new Date()),
        }, {
            $inc: { uptime: 2 },
        });
        res.status(200).json(true);
    }
    catch (err) {
        if (err instanceof ZodError) {
            throw new HttpError(400);
        }
        else if (err instanceof HttpError) {
            throw err;
        }
        throw new HttpError(500);
    }
});
export { restRouter };
