import dotenv from "dotenv";
import fs from "fs";
if (process.env.NODE_ENV !== "production") {
    console.log("Running on development!");
    dotenv.config({ path: "./.d.env" });
} else {
    console.log("Running on preoduction!");
    if (fs.existsSync("./.env")) {
        dotenv.config({ path: "./.env" });
    } else {
        console.error("File .env doesn't exist");
    }
}

export {};
