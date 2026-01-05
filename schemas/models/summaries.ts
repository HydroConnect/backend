import { model, Schema } from "mongoose";
import * as z from "zod";

interface iSummaries {
    uptime: number;
    timestamp: string;
}

const zSummaries = z.strictObject({
    uptime: z.number().gte(0),
    timestamp: z.iso.datetime(),
});

const summariesSchema = new Schema({
    uptime: { type: Number, required: true, default: 0 }, // In seconds
    timestamp: { type: Date, required: true, immutable: true }, // Is always set to midnight 00.01
});

summariesSchema.index({ timestamp: 1 }, { unique: true });
const summariesModel = model("summaries", summariesSchema);
export { summariesSchema, summariesModel, zSummaries };
export type { iSummaries };
