import { type iReadings } from "../schemas/models/readings.js";

export function chemFormula(readings: iReadings): number {
    return readings.percent;
}
