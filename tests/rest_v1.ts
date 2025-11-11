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

dotenv.config({ path: path.resolve(__dirname, "../.d.env") });

const READINGS_ARR: InstanceType<typeof readingsModel>[] = [];
const SUMMARIES_ARR: InstanceType<typeof summariesModel>[] = [];

const dummyIoTPayload = {
    readings: { pH: 7, tds: 6, temperature: 10, turbidity: 10, control: 13 },
    key: process.env.IOT_KEY,
};

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

    for (let i = 0; i < readingsData.length; i++) {
        const data = readingsData[i];
        READINGS_ARR.push(new readingsModel(data));
        await READINGS_ARR[READINGS_ARR.length - 1]!.save();
    }
    for (let i = 0; i < summariesData.length; i++) {
        const data = summariesData[i];
        SUMMARIES_ARR.push(new summariesModel(data));
        await SUMMARIES_ARR[SUMMARIES_ARR.length - 1]!.save();
    }
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
        expect(summaryData[0].uptime).toEqual(2);
    });
});
