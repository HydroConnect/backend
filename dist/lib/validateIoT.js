export function validateIoT(IoTPayload) {
    if (IoTPayload.key === process.env.IOT_KEY) {
        return true;
    }
    return false;
}
