import { model, Schema } from "mongoose";
import { readingsSchema, zReadings, type iReadings } from "./readings.js";
import * as z from "zod";

interface iSummaries {
    min: iReadings;
    max: iReadings;
    timestamp: string;
}

const zSummaries = z.strictObject({
    min: zReadings,
    max: zReadings,
    timestamp: z.iso.datetime(),
});

const summariesSchema = new Schema({
    min: { type: readingsSchema, required: true },
    max: { type: readingsSchema, required: true },
    timestamp: { type: Date, required: true, immutable: true, default: Date.now() },
});

const summariesModel = model("summaries", summariesSchema);
export { summariesSchema, summariesModel, zSummaries };
export type { iSummaries };
