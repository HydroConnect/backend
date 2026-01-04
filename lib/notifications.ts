import type { iUsageNotification } from "../schemas/models/usageNotifications.js";

export async function sendNotification(type: boolean) {
    const notificationBody: iUsageNotification = {
        notificationId: 1,
        timestamp: new Date().toISOString(),
        type: type,
    };
    console.log(notificationBody);
}
