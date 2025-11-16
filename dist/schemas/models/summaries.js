import { model, Schema } from "mongoose";
import * as z from "zod";
const zSummaries = z.strictObject({
    uptime: z.number().gte(0),
    timestamp: z.iso.datetime(),
});
const summariesSchema = new Schema({
    uptime: { type: Number, required: true, default: 0 },
    timestamp: { type: Date, required: true, immutable: true },
});
summariesSchema.index({ timestamp: 1 }, { unique: true });
const summariesModel = model("summaries", summariesSchema);
export { summariesSchema, summariesModel, zSummaries };
