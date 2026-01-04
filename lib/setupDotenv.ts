import { consoleLogger } from "./logger.js";
import dotenv from "dotenv";
import fs from "fs";
if (process.env.NODE_ENV !== "production") {
    consoleLogger.info("Running on development!");
    dotenv.config({ path: "./.d.env", override: false });
} else {
    consoleLogger.info("Running on production!");

    if (fs.existsSync("./.env")) {
        dotenv.config({ path: "./.env", override: false });
    } else {
        consoleLogger.error("File .env doesn't exist");
        process.exit(1);
    }
}

export {};
