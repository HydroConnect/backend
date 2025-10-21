import type { Request, Response } from "express";

import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { restRouter } from "./controllers/rest.js";
import { createServer } from "http";
import { initSocketIO } from "./controllers/io.js";

dotenv.config({ path: "./.d.env" });

const app = express();
const server = createServer(app);

initSocketIO(server);
mongoose.connect(process.env.DB_URL!).then(() => {
    console.log("Mongoose Running!");
});

app.use(express.json());
app.use("/rest/v1", restRouter);

if (process.env.NODE_ENV !== "production") {
    app.use(express.static("./public"));
}

app.get("/", (req: Request, res: Response) => {
    res.send("Running!");
});

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server Running on ${process.env.PORT || 3000}`);
});
