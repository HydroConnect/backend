import { model, Schema } from "mongoose";

const readingsSchema = new Schema({
    turbidity: { type: Number, required: true },
    pH: { type: Number, required: true },
    tds: { type: Number, required: true },
    temperature: { type: Number, required: true }, // Degree Celcius,
    percent: { type: Number, required: true }, // Percent from formula,
    timestamp: { type: Date, required: true, immutable: true, default: Date.now() },
});

const readingsModel = model("readings", readingsSchema);
export { readingsSchema, readingsModel };
