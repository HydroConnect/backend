import { model, Schema } from "mongoose";
import * as z from "zod";
const zDevices = z.strictObject({
    token: z.string(),
});
const devicesSchema = new Schema({
    token: { type: String, required: true },
});
devicesSchema.index({ token: 1 }, { unique: true });
const devicesModel = model("devices", devicesSchema);
export { devicesSchema, devicesModel, zDevices };
