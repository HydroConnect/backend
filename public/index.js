import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

const connectButton = document.getElementById("connectButton");
const disconnectButton = document.getElementById("disconnectButton");
const sendButton = document.getElementById("sendButton");
const getSummaryButton = document.getElementById("getSummaryButton");
const getLatestButton = document.getElementById("getLatestButton");
const downloadButton = document.getElementById("downloadButton");

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
