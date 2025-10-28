import { model, Schema } from "mongoose";
import * as z from "zod";

interface iReadings {
    turbidity: number;
    pH: number;
    tds: number;
    temperature: number;
    control: number;
    percent: number;
    timestamp: string;
}

const zReadings = z.strictObject({
    turbidity: z.number(),
    pH: z.number(),
    tds: z.number(),
    temperature: z.number(),
    control: z.int().min(0).max(31),
    percent: z.number(),
    timestamp: z.iso.datetime(),
});

const readingsSchema = new Schema({
    turbidity: { type: Number, required: true },
    pH: { type: Number, required: true },
    tds: { type: Number, required: true },
    temperature: { type: Number, required: true }, // Degree Celcius,
    control: { type: Number, required: true }, // For control info MSB --> LSB (valve, sensor, distribution, resservoir, tank)
    percent: { type: Number, required: true }, // Percent from formula,
    timestamp: { type: Date, required: true, immutable: true, default: Date.now },
});

readingsSchema.index({ timestamp: 1 }, { unique: true });

const readingsModel = model("readings", readingsSchema);
export { readingsSchema, readingsModel, zReadings };
export type { iReadings };
