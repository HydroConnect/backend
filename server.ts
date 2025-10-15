import type { Request, Response } from "express";
require("dotenv").config({ path: "./.d.env" });
const express = require("express");
const app = express();

app.get("/", (req: Request, res: Response) => {
    res.send("Halo!\n");
});

app.listen(process.env.PORT, () => {
    console.log("Server Running!");
});
