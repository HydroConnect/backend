import * as z from "zod";
const zUsageNotification = z.strictObject({
    timestamp: z.int(),
    type: z.boolean(),
});
export { zUsageNotification };
