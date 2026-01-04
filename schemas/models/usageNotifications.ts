import { model, Schema } from "mongoose";
import * as z from "zod";

interface iUsageNotification {
    notificationId: number;
    timestamp: string;
    type: boolean;
}

const zUsageNotification = z.strictObject({
    notificationId: z.int(),
    timestamp: z.iso.datetime(),
    type: z.boolean(),
});

const usageNotificationsSchema = new Schema({
    notificationId: { type: Number, required: true, immutable: true },
    timestamp: { type: Date, required: true, immutable: true },
    type: { type: Boolean, required: true, immutable: true },
});

usageNotificationsSchema.index({ notificationId: 1 }, { unique: true });
const usageNotificationsModel = model("usageNotifications", usageNotificationsSchema);
export { usageNotificationsSchema, zUsageNotification, usageNotificationsModel };
export type { iUsageNotification };
