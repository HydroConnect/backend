import { model, Schema } from "mongoose";
import * as z from "zod";

interface iSummaries {
    uptime: number; // In seconds
    timestamp: string; // Is always set to midnight 00.00
}

const zSummaries = z.strictObject({
    uptime: z.number().gte(0),
    timestamp: z.iso.datetime(),
});

const summariesSchema = new Schema({
    uptime: { type: Number, required: true, default: 0 },
    timestamp: { type: Date, required: true, immutable: true, default: Date.now },
});

summariesSchema.index({ timestamp: 1 }, { unique: true });
const summariesModel = model("summaries", summariesSchema);
export { summariesSchema, summariesModel, zSummaries };
export type { iSummaries };
