import * as z from "zod";

interface iUsageNotification {
    timestamp: number;
    type: boolean;
}

const zUsageNotification = z.strictObject({
    timestamp: z.int(),
    type: z.boolean(),
});

export { zUsageNotification };
export type { iUsageNotification };
