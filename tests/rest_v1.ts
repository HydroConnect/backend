import { it, describe, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Axios } from "axios";
import { readingsModel, zReadings } from "../schemas/models/readings.js";
import { summariesModel, zSummaries } from "../schemas/models/summaries.js";
import { readFileSync } from "fs";
import { createHash, randomBytes } from "crypto";
import { getMidnightDate } from "../controllers/rest.js";
import {
    usageNotificationsModel,
    zUsageNotification,
} from "../schemas/models/usageNotifications.js";
import { devicesModel } from "../schemas/models/devices.js";
import { idsModel } from "../schemas/models/ids.js";
import { zPanduanData, type iPanduanData } from "../schemas/panduanData.js";

dotenv.config({ path: path.resolve(__dirname, "../.d.env"), override: false });

const READINGS_ARR: InstanceType<typeof readingsModel>[] = [];
const SUMMARIES_ARR: InstanceType<typeof summariesModel>[] = [];

const dummyIoTPayload = {
    readings: { pH: 7.2, tds: 120, temperature: 24, turbidity: 0.8, control: 31 },
    key: process.env.IOT_KEY,
};
const dummyUsageNotifications = {
    notificationId: 0,
    timestamp: new Date(),
    type: 1,
};
const dummyExpoToken = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";

beforeAll(async () => {
    const readingsData = JSON.parse(
        readFileSync(path.resolve(__dirname, "samples", "readingsTest.json")).toString("utf-8")
    );
    const summariesData = JSON.parse(
        readFileSync(path.resolve(__dirname, "samples", "summariesTest.json")).toString("utf-8")
    );

    await mongoose.connect(process.env.DB_URL!);
    await readingsModel.deleteMany();
    await summariesModel.deleteMany();
    await devicesModel.deleteMany();
    await usageNotificationsModel.deleteMany();
    await idsModel.deleteMany();

    for (let i = 0; i < readingsData.length; i++) {
        const data = readingsData[i];
        READINGS_ARR.push(new readingsModel(data));
        await READINGS_ARR[READINGS_ARR.length - 1]!.save();
    }

    const nowTimestamp = getMidnightDate(new Date());
    nowTimestamp.setUTCDate(nowTimestamp.getDate() - summariesData.length - 2);
    for (let i = 0; i < summariesData.length; i++) {
        const data = summariesData[i];
        data.timestamp = nowTimestamp;
        SUMMARIES_ARR.push(new summariesModel(data));
        await SUMMARIES_ARR[SUMMARIES_ARR.length - 1]!.save();

        nowTimestamp.setUTCDate(nowTimestamp.getDate() + 1);
    }

    for (let i = 0; i < 8; i++) {
        const myModel = new usageNotificationsModel(dummyUsageNotifications);
        myModel.notificationId = i + 1;
        await myModel.save();
    }

    await new idsModel({
        notificationId: 9,
    }).save();
});

afterAll(async () => {
    await mongoose.disconnect();
});

const myaxios = new Axios({
    headers: {
        "Content-Type": "application/json",
    },
    baseURL: "http://localhost:3000/rest/v1/",
});

describe("GET /summary", () => {
    it("Request summary", async () => {
        const data = JSON.parse((await myaxios.get("/summary")).data);
        expect(() => {
            for (let i = 0; i < data.length; i++) {
                zSummaries.parse(data[i]);
            }
        }).not.toThrow();
        expect(data[0].timestamp).toEqual(getMidnightDate(new Date()).toISOString());
        expect(data[0].uptime).toEqual(0);
        expect(data.length).toEqual(7);
    });
});

describe("GET /latest", () => {
    it("Request latest reading", async () => {
        const data = JSON.parse((await myaxios.get("/latest")).data);
        expect(() => {
            zReadings.parse(data);
        }).not.toThrow();
    });
});

describe("POST /readings", () => {
    it("Rejects Invalid Body", async () => {
        const { status } = await myaxios.post(
            "/readings",
            JSON.stringify({
                invalid: "data",
            })
        );
        expect(status).toEqual(400);
    });

    it("Rejects Invalid Key", async () => {
        const { status } = await myaxios.post(
            "/readings",
            JSON.stringify({
                readings: dummyIoTPayload.readings,
                key: createHash("sha512")
                    .update(randomBytes(2 ^ 30))
                    .digest("base64url"),
            })
        );
        expect(status).toEqual(403);
    });

    it("Post readings", async () => {
        await myaxios.post("/readings", JSON.stringify(dummyIoTPayload));
        const data = JSON.parse((await myaxios.get("/latest")).data);
        expect(new Date(data.timestamp) > READINGS_ARR[READINGS_ARR.length - 1]!.timestamp).toEqual(
            true
        );
        const summaryData = JSON.parse((await myaxios.get("/summary")).data);
        expect(summaryData[0].uptime).toEqual(parseInt(process.env.IOT_INTERVAL_MS!) / 1000);
    });

    it("Chem Formula is right", async () => {
        await myaxios.post("/readings", JSON.stringify(dummyIoTPayload));
        const data = JSON.parse((await myaxios.get("/latest")).data);
        expect(data.percent).toEqual(100);
    });
});

describe("GET /panduan", () => {
    it("Get panduan", async () => {
        const data = JSON.parse((await myaxios.get("/panduan")).data);
        expect(() => {
            data.forEach((val: iPanduanData) => {
                zPanduanData.parse(val);
            });
        }).not.toThrow();
    });
});

describe("GET /notifications", () => {
    it("Get LIMIT notifications", async () => {
        const data = JSON.parse((await myaxios.get("/notifications")).data);
        expect(() => {
            zUsageNotification.parse(
                data[parseInt(process.env.USAGE_NOTIFICATION_PAGING_LIMIT!) - 1]
            );
        }).not.toThrow();
    });

    it("Pages", async () => {
        const data1 = JSON.parse((await myaxios.get("/notifications?latest=")).data);
        const data2 = JSON.parse(
            (await myaxios.get("/notifications?latest=" + data1[data1.length - 1].notificationId))
                .data
        );
        expect(data1[data1.length - 1]).not.toEqual(data2[0]);
    });
});

describe("POST /notifications/register", () => {
    it("Rejects Invalid Body", async () => {
        const { status } = await myaxios.post(
            "/notifications/register",
            JSON.stringify({
                token: "data",
            })
        );
        expect(status).toEqual(400);
    });
    it("Register Device", async () => {
        const { status } = await myaxios.post(
            "/notifications/register",
            JSON.stringify({
                token: dummyExpoToken,
            })
        );
        expect(status).toEqual(200);
        const res = await devicesModel.find();
        expect(res.length === 1);
    });
    it("Doesn't double", async () => {
        const { status } = await myaxios.post(
            "/notifications/register",
            JSON.stringify({
                token: dummyExpoToken,
            })
        );
        expect(status).toEqual(200);
        const res = await devicesModel.find();
        expect(res.length === 1);
    });
});

describe("POST /notifications/unregister", () => {
    it("Rejects Invalid Body", async () => {
        const { status } = await myaxios.post(
            "/notifications/unregister",
            JSON.stringify({
                token: "data",
            })
        );
        expect(status).toEqual(400);
    });
    it("Unregister Device", async () => {
        const { status } = await myaxios.post(
            "/notifications/unregister",
            JSON.stringify({
                token: dummyExpoToken,
            })
        );
        expect(status).toEqual(200);
        const res = await devicesModel.find();
        expect(res.length === 0);
    });
});

describe("Send Notifications", () => {
    const realExpoToken = `${dummyExpoToken}`; // Change to real expo token on testing
    const limit =
        parseInt(process.env.IOT_INTERVAL_MS!) + parseInt(process.env.IOT_INTERVAL_TOLERANCE_MS!);
    it.todo("Change expo token to be equal in phone");
    it("Prepare for Notification Sending", () => {
        return new Promise((resolve) => {
            myaxios
                .post(
                    "/notifications/register",
                    JSON.stringify({
                        token: realExpoToken,
                    })
                )
                .then(() => {
                    setTimeout(async () => {
                        await myaxios.post("/readings", JSON.stringify(dummyIoTPayload));
                        setTimeout(async () => {
                            resolve(true);
                        }, limit);
                    }, limit);
                });
        });
    });

    it.todo("Check for Notification Receipts");
    it.todo("Check for Notification on Phone");
});
