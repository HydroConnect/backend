import type { iIoTPayload } from "../schemas/IoTPayload.js";

export function validateIoT(IoTPayload: iIoTPayload): boolean {
    if (IoTPayload.key === process.env.IOT_KEY) {
        return true;
    }
    return false;
}
