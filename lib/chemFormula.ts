import type { iIoTPayload } from "../schemas/IoTPayload.js";

export function chemFormula(readings: iIoTPayload["readings"]): number {
    return readings.pH;
}
