import {} from "./lib/setupDotenv.js";
import express from "express";
import mongoose from "mongoose";
import { createServer } from "http";
import { initSocketIO } from "./controllers/io.js";
import { restRouter } from "./controllers/rest.js";
import { RESTErrorHandler } from "./lib/errorHandler.js";
const app = express();
const server = createServer(app);
initSocketIO(server);
mongoose.connect(process.env.DB_URL).then(() => {
    console.log("Mongoose Running!");
});
app.use(express.json());
app.use("/rest/v1", restRouter);
if (process.env.NODE_ENV === "development") {
    app.use(express.static("./public"));
}
app.get("/", (req, res) => {
    res.send("Running!");
});
app.use(RESTErrorHandler);
server.listen(process.env.PORT || 3000, () => {
    console.log(`Server Running on ${process.env.PORT || 3000}`);
});
