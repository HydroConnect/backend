import type { Request, Response } from "express";

import { Router } from "express";
import { summariesModel } from "../schemas/models/summaries.js";
import { readingsModel, type iReadings } from "../schemas/models/readings.js";
import { zIoTPayload, type iIoTPayload } from "../schemas/IoTPayload.js";
import { chemFormula } from "../lib/chemFormula.js";
import { validateIoT } from "../lib/validateIoT.js";
import { HttpError } from "../lib/errorHandler.js";
import { getIO } from "./io.js";
import { ZodError } from "zod";
import crypto from "crypto";
import { exec } from "child_process";
import { usageNotificationsModel } from "../schemas/models/usageNotifications.js";
import { devicesModel, zDevices } from "../schemas/models/devices.js";
import { sendNotification } from "../lib/notifications.js";
import { Expo } from "expo-server-sdk";
import { consoleLogger } from "../lib/logger.js";
import type { iPanduanData } from "../schemas/panduanData.js";
import { getMidnightDate } from "../lib/utils.js";

const restRouter = Router();
let summaryLastEntry: string | undefined = undefined;
let latestReading: { readings: iReadings; cachedTime: number } | null = null; // Cache for latest reading

async function populateTodaySummary() {
    const nowMidnight = getMidnightDate(new Date());
    const nowMidISO = nowMidnight.toISOString();
    if (summaryLastEntry === nowMidISO) {
        return;
    }
    const summary = await summariesModel.findOne().sort({ timestamp: -1 });
    if (!summary || summary.timestamp.toISOString() !== nowMidISO) {
        // Add today's date
        await new summariesModel({
            uptime: 0,
            timestamp: nowMidnight,
        }).save();
        if (process.env.NODE_ENV !== "production") {
            summaryLastEntry = undefined;
            return;
        }
        summaryLastEntry = nowMidISO;
    }
}

restRouter.get("/summary", async (req: Request, res: Response) => {
    let nowDate = new Date();
    if (typeof req.query?.end_date === "string" && !isNaN(parseInt(req.query.end_date))) {
        nowDate = new Date(parseInt(req.query.end_date));
    }
    nowDate = getMidnightDate(nowDate);

    // This is to copy and not saving the reference
    const earliestDate = new Date(nowDate);
    earliestDate.setUTCDate(earliestDate.getDate() - 7);
    const summary = await summariesModel.find(
        { timestamp: { $gt: earliestDate, $lte: nowDate } },
        { __v: 0, _id: 0 }
    );
    const output: any[] = [];

    let idx = summary.length - 1;
    for (let i = 0; i < 7; i++) {
        if (summary.length === 7) {
            output.push(summary[idx]!.toJSON());
            idx--;
        } else {
            let supposedDatetime = new Date(nowDate);
            supposedDatetime.setUTCDate(supposedDatetime.getDate() - i);
            supposedDatetime = getMidnightDate(supposedDatetime);
            if (
                idx >= 0 &&
                summary[idx]!.timestamp.toISOString() === supposedDatetime.toISOString()
            ) {
                output.push(summary[idx]!.toJSON());
                idx--;
            } else {
                output.push({ timestamp: supposedDatetime, uptime: 0 });
            }
        }
    }

    // Output is already projected with _id and __v
    res.status(200).json(output);
});

restRouter.get("/latest", async (req: Request, res: Response) => {
    if (
        latestReading === null ||
        Date.now() - latestReading.cachedTime >
            parseInt(process.env.REST_CACHE_EXPIRE_TIME_S!) * 1000
    ) {
        const dbRead = await readingsModel
            .findOne({}, { _id: 0, __v: 0 })
            .sort({ timestamp: "desc" });
        if (dbRead) {
            latestReading = {
                // @ts-expect-error This is the same type ase the reading thing
                readings: dbRead,
                cachedTime: Date.now(),
            };
        }
    }
    res.status(200).json(latestReading?.readings ?? null);
});

let notificationTimeout: null | NodeJS.Timeout = null;
restRouter.post("/readings", async (req: Request, res: Response) => {
    try {
        await populateTodaySummary();
        req.body = zIoTPayload.parse(req.body);
        if (!validateIoT(req.body as iIoTPayload)) {
            throw new HttpError(403);
        }

        const payload: iReadings = {
            ...(req.body as iIoTPayload).readings,
            timestamp: new Date(Date.now()).toISOString(),
            percent: chemFormula((req.body as iIoTPayload).readings),
        };

        latestReading = { readings: payload, cachedTime: Date.now() };
        getIO().of("/io/v1").emit("readings", payload);
        await new readingsModel(payload).save();

        // Update Uptime
        await summariesModel.updateOne(
            {
                timestamp: summaryLastEntry
                    ? new Date(summaryLastEntry!)
                    : getMidnightDate(new Date()),
            },
            {
                $inc: { uptime: parseInt(process.env.IOT_INTERVAL_MS!) / 1000 },
            }
        );

        // Send Notification
        if (notificationTimeout === null) {
            // Send On
            sendNotification(true);
        } else {
            clearTimeout(notificationTimeout);
        }
        notificationTimeout = setTimeout(
            () => {
                // Send Off
                sendNotification(false);
                notificationTimeout = null;
            },
            parseInt(process.env.IOT_INTERVAL_TOLERANCE_MS!) +
                parseInt(process.env.IOT_INTERVAL_MS!)
        );

        res.status(200).json(true);
    } catch (err) {
        if (err instanceof ZodError) {
            throw new HttpError(400);
        } else if (err instanceof HttpError) {
            throw err;
        }

        throw new HttpError(500);
    }
});

restRouter.get("/notifications", async (req: Request, res: Response) => {
    let latest: number | null = parseInt(req.query.latest as any);
    const pagingLimit = parseInt(process.env.USAGE_NOTIFICATION_PAGING_LIMIT!);

    let query = {};

    if (Number.isNaN(latest)) {
        latest = null;
    } else {
        query = {
            notificationId: {
                $lt: latest,
                $gte: latest - pagingLimit,
            },
        };
    }

    const notifications = await usageNotificationsModel
        .find(query, { __v: 0, _id: 0 })
        .sort({ notificationId: -1 })
        .limit(pagingLimit);

    return res.json(notifications);
});

restRouter.post("/notifications/register", async (req: Request, res: Response) => {
    try {
        req.body = zDevices.parse(req.body);
        if (!Expo.isExpoPushToken(req.body.token)) {
            throw "Not Expo Push Token";
        }
    } catch {
        throw new HttpError(400);
    }
    await devicesModel.updateOne(
        req.body,
        { $setOnInsert: req.body },
        { upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(true);
});

restRouter.post("/notifications/unregister", async (req: Request, res: Response) => {
    try {
        req.body = zDevices.parse(req.body);
        if (!Expo.isExpoPushToken(req.body.token)) {
            throw "Not Expo Push Token";
        }
    } catch {
        throw new HttpError(400);
    }
    await devicesModel.deleteOne(req.body);
    res.status(200).json(true);
});

const myPanduanData: iPanduanData[] = [
    {
        title: "Cara Merawat Panel Surya",
        videoUrl: "https://www.youtube.com/watch?v=lnqGPnFxlKE",
        thumbnailUrl: "https://img.youtube.com/vi/lnqGPnFxlKE/maxresdefault.jpg",
        steps: [
            "Lakukan perawatan panel surya secara rutin setiap 1 bulan sekali dengan memeriksa kondisi panel.",
            "Pastikan tidak ada benda yang menutupi panel seperti daun, ranting, atau kotoran lainnya.",
            "Bersihkan permukaan panel menggunakan lap dengan cara mengusap satu arah, dan gunakan deterjen jika ada noda yang sulit dibersihkan.",
            "Periksa kondisi fisik panel, pastikan tidak ada retakan atau kerusakan pada permukaan panel.",
            "Cek kabel-kabel pada panel surya untuk memastikan semuanya terpasang dan berfungsi dengan baik, serta hubungi teknisi jika ditemukan masalah.",
        ],
    },
    {
        title: "Cara Menggunakan Filter Air",
        videoUrl: "https://youtube.com/watch?v=04ESFHJmY_E",
        thumbnailUrl: "https://img.youtube.com/vi/04ESFHJmY_E/maxresdefault.jpg",
        steps: [
            "Pilih sumber listrik dengan menyalakan saklar dari PLN atau panel surya.",
            "Nyalakan mesin pompa air dengan memasukkan saklar hingga mesin aktif dan air mulai diproses oleh mesin penjernih.",
            "Lakukan perawatan rutin setiap 2 minggu sekali dengan metode backwash untuk membersihkan media filter di dalam mesin.",
            "Saat backwash, hidupkan mesin lalu geser tuas ke posisi paling kiri selama sekitar 15 menit sambil membuka aliran air hingga kotoran keluar.",
            "Setelah itu geser tuas ke posisi tengah selama sekitar 5 menit untuk pembilasan, lalu kembalikan lagi ke posisi semula hingga air kembali jernih.",
        ],
    },
    {
        title: "Cara Membersihkan Filter Air",
        videoUrl: "https://youtube.com/watch?v=3oXhSL3xQgQ",
        thumbnailUrl: "https://img.youtube.com/vi/3oXhSL3xQgQ/maxresdefault.jpg",
        steps: [
            "Periksa busa filter dan jika tampungan sudah penuh hingga air hampir meluap, buka sedikit penutupnya untuk mengeluarkan sisa air di pipa.",
            "Setelah air tidak meluap, buka penutup filter menggunakan alat yang tersedia dengan memutarnya ke arah kiri.",
            "Keluarkan busa filter lama dari tempatnya dan buang jika sudah kotor atau tidak layak digunakan.",
            "Tunggu hingga sisa air di dalam pipa benar-benar habis sebelum memasang filter baru.",
            "Pasang busa filter yang baru, lalu kencangkan kembali menggunakan alat hingga terpasang dengan aman.",
        ],
    },
    {
        title: "Cara Backwash Filter Air",
        videoUrl: "https://youtube.com/watch?v=qkBqR70C86M",
        thumbnailUrl: "https://img.youtube.com/vi/qkBqR70C86M/maxresdefault.jpg",
        steps: [
            "Pastikan kran air terbuka dan air sudah mengalir sebelum mesin penyaringan digunakan.",
            "Lakukan backwash dengan memutar panel ke posisi paling kanan selama sekitar 15 menit untuk membersihkan filter sambil memeriksa kejernihan air.",
            "Setelah air terlihat lebih jernih, pindahkan panel ke posisi tengah selama sekitar 5 menit untuk proses pembilasan.",
            "Jika air sudah terlihat jernih, pindahkan panel ke posisi paling kiri sehingga air siap digunakan.",
            "Lakukan perawatan ini setiap 2 minggu sekali agar mesin tetap awet dan kualitas air tetap terjaga.",
        ],
    },
];

restRouter.get("/panduan", async (req: Request, res: Response) => {
    res.status(200).json(myPanduanData);
});

restRouter.post("/github-webhook", (req: Request, res: Response) => {
    // Validate Payload
    const expectedHex = crypto
        .createHmac("sha256", Buffer.from(process.env.GITHUB_WEBHOOK_SECRET!, "utf8"))
        // @ts-expect-error This access the rawBody we define in our middleware
        .update(Buffer.from(req.rawBody, "utf8"))
        .digest("hex");

    // Convert both to Buffers
    const expected = Buffer.from(expectedHex, "hex");
    const nowHeader = req.header("X-Hub-Signature-256");
    if (nowHeader) {
        const received = Buffer.from(nowHeader.split("sha256=")[1]!, "hex");

        // Must be same length or timingSafeEqual throws
        if (expected.length === received.length) {
            if (
                crypto.timingSafeEqual(expected, received) &&
                req.body.repository.full_name === "HydroConnect/backend"
            ) {
                res.status(200).json(true);
                consoleLogger.warn(`Updating Codebase!`);
                if (process.env.NODE_ENV === "production" && process.env.IS_LINUX === "true") {
                    // Watch out this could be DANGEROUS!!!
                    exec("sudo systemctl restart hydroconnect");
                }
                return;
            }
        }
    }

    res.status(403).json("Unauthorized");
});

export { restRouter };
