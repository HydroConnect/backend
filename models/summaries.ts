import { model, Schema } from "mongoose";
import { readingsSchema } from "./readings.js";

const summariesSchema = new Schema({
    min: { type: readingsSchema, required: true },
    max: { type: readingsSchema, required: true },
    timestamp: { type: Date, required: true, immutable: true, default: Date.now() },
});

const summariesModel = model("summaries", summariesSchema);
export { summariesSchema, summariesModel };
