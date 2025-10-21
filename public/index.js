import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

const connectButton = document.getElementById("connectButton");
const disconnectButton = document.getElementById("disconnectButton");
const sendButton = document.getElementById("sendButton");

const socket = io("http://localhost:3000/io/v1", {
    autoConnect: false,
});

connectButton.addEventListener("click", () => {
    socket.connect();
});
disconnectButton.addEventListener("click", () => {
    socket.disconnect();
});
sendButton.addEventListener("click", () => {
    socket.emit("post-readings", {
        pH: 7,
        tds: 6,
        temperature: 10,
        turbidity: 10,
    });
});

socket.on("connect", () => {
    console.log("Connected!");
});
socket.on("disconnect", () => {
    console.log("Disconnected!");
});
socket.on("readings", (data) => {
    console.log(data);
});
