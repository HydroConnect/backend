import * as z from "zod";
import { zReadings, type iReadings } from "./models/readings.js";

interface iIoTPayload {
    key: string;
    readings: Omit<iReadings, "timestamp" | "percent">;
}

const zIoTPayload = z.strictObject({
    key: z.hash("sha512", { enc: "base64url" }),
    readings: zReadings.omit({ timestamp: true, percent: true }),
});

export { zIoTPayload };
export type { iIoTPayload };
