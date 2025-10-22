import { model, Schema } from "mongoose";
import { readingsSchema, zReadings } from "./readings.js";
import * as z from "zod";
const zSummaries = z.strictObject({
    min: zReadings,
    max: zReadings,
    timestamp: z.iso.datetime(),
});
const summariesSchema = new Schema({
    min: { type: readingsSchema, required: true },
    max: { type: readingsSchema, required: true },
    timestamp: { type: Date, required: true, immutable: true, default: Date.now },
});
summariesSchema.index({ timestamp: 1 }, { unique: true });
const summariesModel = model("summaries", summariesSchema);
export { summariesSchema, summariesModel, zSummaries };
