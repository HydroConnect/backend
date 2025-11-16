import * as z from "zod";
import { zReadings } from "./models/readings.js";
const zIoTPayload = z.strictObject({
    key: z.hash("sha512", { enc: "base64url" }),
    readings: zReadings.omit({ timestamp: true, percent: true }),
});
export { zIoTPayload };
