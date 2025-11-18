import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

const connectButton = document.getElementById("connectButton");
const disconnectButton = document.getElementById("disconnectButton");
const sendButton = document.getElementById("sendButton");
const getSummaryButton = document.getElementById("getSummaryButton");
const getLatestButton = document.getElementById("getLatestButton");
const downloadButton = document.getElementById("downloadButton");
const simulateIoTOnButton = document.getElementById("simulateIoTOnButton");
const simulateIoTOffButton = document.getElementById("simulateIoTOffButton");

const socket = io("/io/v1", {
    autoConnect: false,
});

connectButton.addEventListener("click", () => {
    socket.connect();
});
disconnectButton.addEventListener("click", () => {
    socket.disconnect();
});
sendButton.addEventListener("click", async () => {
    console.log(
        await (
            await fetch("rest/v1/readings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    readings: { pH: 7, tds: 6, temperature: 10, turbidity: 10, control: 13 },
                    key: "_49lFI-ngS-9eTp8enaRCMG6ZwLeQQaorZ_RgAvxBP4DtYoUvVokG9whNZ9khQw3OL00xnRnko08vnKtHfAbVA",
                }),
            })
        ).json()
    );
});
getSummaryButton.addEventListener("click", async () => {
    console.log(await (await fetch("rest/v1/summary")).json());
});
getLatestButton.addEventListener("click", async () => {
    console.log(await (await fetch("rest/v1/latest")).json());
});
downloadButton.addEventListener("click", () => {
    socket.emit("download-request", {
        from: "2025-10-22T01:32:11.043Z",
        to: "2025-10-22T01:32:11.048Z",
        downloadId: "MDOW",
    });
});

function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

let isSimulating = false;
async function reccurSimulation() {
    await fetch("rest/v1/readings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            readings: {
                pH: random(55, 95) / 10,
                tds: random(0, 700),
                temperature: random(18, 30),
                turbidity: random(0, 11),
                control: random(0, 31),
            },
            key: "_49lFI-ngS-9eTp8enaRCMG6ZwLeQQaorZ_RgAvxBP4DtYoUvVokG9whNZ9khQw3OL00xnRnko08vnKtHfAbVA",
        }),
    });

    if (!isSimulating) {
        return;
    }
    setTimeout(() => {
        reccurSimulation();
    }, random(2000, 3000));
}

simulateIoTOnButton.addEventListener("click", () => {
    if (isSimulating) {
        return;
    }
    isSimulating = true;
    reccurSimulation();
});
simulateIoTOffButton.addEventListener("click", () => {
    isSimulating = false;
});

socket.on("connect", () => {
    console.log("Connected!");
});
socket.on("disconnect", () => {
    console.log("Disconnected!");
});
socket.on("error", (err) => {
    console.log(err);
});
socket.on("readings", (data) => {
    console.log(data);
});
socket.on("download-data", (readings, downloadId, ack) => {
    console.log("Data for " + downloadId);
    console.log(...readings);
    ack();
});
socket.on("download-finish", (downloadId) => {
    console.log("Download for " + downloadId + " has finished!");
});
