import { Expo } from "expo-server-sdk";
import { devicesModel } from "../schemas/models/devices.js";
import { usageNotificationsModel } from "../schemas/models/usageNotifications.js";
import { formatDate, getJam } from "./utils.js";
import { idsModel } from "../schemas/models/ids.js";
import { logger } from "./logger.js";

const expo = new Expo({
    useFcmV1: true,
});

let dontSendUntil: null | number = null;
let nextBackoffS = parseInt(process.env.INITIAL_NOTIF_BACKOFF_S!);

async function getNotificationId() {
    return (await idsModel.findOneAndUpdate(
        {},
        {
            $inc: {
                notificationId: 1,
            },
        },
        { upsert: true, setDefaultsOnInsert: true }
    ))!.notificationId;
}

export async function sendNotification(type: boolean) {
    if (process.env.DISABLE_NOTIFICATION === "true") {
        return;
    }
    try {
        const nowDate = new Date();

        // Save to DB
        await new usageNotificationsModel({
            notificationId: await getNotificationId(),
            timestamp: nowDate,
            type: type,
        }).save();

        // This is exponential backoff
        if (dontSendUntil !== null && Date.now() < dontSendUntil) {
            return;
        }

        // Send Notifs
        const tokens = (
            (await devicesModel.find({}, { __v: 0, _id: 0 })) as { token: string }[]
        ).map((val) => {
            return val.token;
        });
        if (tokens.length === 0) {
            return;
        }
        const chunks = expo.chunkPushNotifications([
            {
                to: tokens,
                title: type ? "Pompa dinyalakan" : "Pompa dimatikan",
                body: type
                    ? `Pompa nyala pada ${formatDate(nowDate)} (${getJam(nowDate)})`
                    : `Pompa mati pada ${formatDate(nowDate)} (${getJam(nowDate)})`,
            },
        ]);
        logger.info(`Sending ${type ? "On" : "Off"} Notification`);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (err) {
                logger.error(`Expo connection error (at sending notification): ${err}`);
            }
        }

        // Get receipts
        const receiptIds = [];
        for (const pushTicket of tickets) {
            if (pushTicket.status === "error") {
                logger.error(`Error pushTicket Notification: ${pushTicket.message}`);
                if (pushTicket.details?.error === "DeviceNotRegistered") {
                    // Delete pushToken
                    await devicesModel.deleteOne({
                        token: pushTicket.details.expoPushToken,
                    });
                }
            } else {
                receiptIds.push(pushTicket.id);
            }
        }
        let shuoldImplementBackoff = false;
        const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        for (const chunk of receiptIdChunks) {
            try {
                const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

                for (const recId in receipts) {
                    const rec = receipts[recId]!;
                    if (rec.status === "error") {
                        logger.error(`Error pushReceipt Notification: ${rec.message}`);
                        switch (rec.details?.error) {
                            case "DeviceNotRegistered":
                                // Delete pushToken
                                await devicesModel.deleteOne({
                                    token: rec.details.expoPushToken,
                                });
                                break;
                            case "MessageRateExceeded":
                                // Implement Backoff
                                if (shuoldImplementBackoff === false) {
                                    shuoldImplementBackoff = true;
                                    dontSendUntil = Date.now() + nextBackoffS * 1000;
                                    nextBackoffS *= parseInt(process.env.NOTIF_BACKOFF_MULTIPLIER!);
                                }
                                break;
                        }
                    }
                }
            } catch (err) {
                logger.error(`Expo connection error (at requesting receipt): ${err}`);
            }
        }

        if (!shuoldImplementBackoff) {
            dontSendUntil = null;
            nextBackoffS = parseInt(process.env.INITIAL_NOTIF_BACKOFF_S!);
        }
    } catch (err) {
        logger.error(`Unexpected server error (at 'sendNotification()'): ${err}`);
    }
}
