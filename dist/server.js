import {} from "./lib/setupDotenv.js";
import express from "express";
import mongoose from "mongoose";
import { createServer } from "http";
import { initSocketIO } from "./controllers/io.js";
import { restRouter } from "./controllers/rest.js";
import { RESTErrorHandler } from "./lib/errorHandler.js";
import { consoleLogger } from "./lib/logger.js";
const app = express();
const server = createServer(app);
initSocketIO(server);
mongoose.connect(process.env.DB_URL).then(() => {
    consoleLogger.info("Mongoose Running!");
});
app.use(express.json({
    verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            // @ts-expect-error This add a new property req.rawBody
            req.rawBody = buf.toString(encoding || "utf8");
        }
    },
}));
app.use("/rest/v1", restRouter);
if (process.env.NODE_ENV !== "production") {
    app.use(express.static("./public"));
}
app.get("/", (req, res) => {
    res.send("Running! (V1.2.0)");
});
app.use(RESTErrorHandler);
server.listen(process.env.PORT || 3000, () => {
    consoleLogger.info(`Server Running on ${process.env.PORT || 3000}`);
});
