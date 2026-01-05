import { beforeAll, describe, expect, it } from "vitest";
import path from "path";
import dotenv from "dotenv";
import io from "socket.io-client";
import { Axios } from "axios";
import { zReadings } from "../schemas/models/readings.js";
dotenv.config({ path: path.resolve(__dirname, "../.d.env"), override: false });
const dummyIoTPayload = {
    readings: { pH: 7, tds: 6, temperature: 10, turbidity: 10, control: 13 },
    key: process.env.IOT_KEY,
};
const downloadRequestPayload = {
    from: "2025-10-22T01:32:11.043Z",
    to: "2025-10-22T01:32:11.048Z",
    downloadId: "MDOW",
};
const socket = io("http://localhost:3000/io/v1");
const myaxios = new Axios({
    headers: {
        "Content-Type": "application/json",
    },
    baseURL: "http://localhost:3000/rest/v1/",
});
beforeAll(() => {
    return new Promise((resolve) => {
        socket.on("connect", () => {
            resolve(true);
        });
    });
});
describe("EMIT readings", () => {
    it("Accepts realtime readings", async () => {
        return new Promise((resolve) => {
            socket.on("readings", (readings) => {
                zReadings.parse(readings);
                resolve(true);
            });
            myaxios.post("/readings", JSON.stringify(dummyIoTPayload));
        });
    });
});
describe("Downloads", () => {
    it("ON download-request + EMIT download-data (ack) + EMIT download-finish + Reject consecutive downloads", () => {
        return new Promise((resolve) => {
            let isError = false;
            socket.on("download-data", (readings, downloadId, ack) => {
                expect(downloadId !== downloadRequestPayload.downloadId);
                expect(() => {
                    zReadings.parse(readings[0]);
                }).not.toThrow();
                ack(true);
            });
            socket.on("error", (err) => {
                expect(err.name).toEqual("IOError");
                isError = true;
            });
            socket.on("download-finish", (downloadId) => {
                expect(downloadId !== downloadRequestPayload.downloadId);
                expect(isError).toEqual(true);
                resolve(true);
            });
            socket.emit("download-request", downloadRequestPayload);
            socket.emit("download-request", downloadRequestPayload);
        });
    });
    it("Cancel on ack(false)", () => {
        return new Promise((resolve) => {
            socket.on("download-data", (readings, downloadId, ack) => {
                expect(downloadId !== downloadRequestPayload.downloadId);
                expect(() => {
                    zReadings.parse(readings[0]);
                }).not.toThrow();
                ack(false);
            });
            socket.on("download-finish", () => {
                expect(1).toBe(2);
                resolve(false);
            });
            socket.emit("download-request", downloadRequestPayload);
            setTimeout(() => {
                resolve(true);
            }, parseInt(process.env.MIN_DOWNLOAD_INTERVAL_SECONDS) * 1000);
        });
    });
});
