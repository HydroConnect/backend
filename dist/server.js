"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const app = express();
app.get("/", (req, res) => {
    res.send("Tunning!\n");
});
app.listen(3000, () => {
    console.log("Server Running!");
});
