// This file is to be run using tsx
import {} from "./lib/setupDotenv.js";
import mongoose from "mongoose";
import { idsModel } from "./schemas/models/ids.js";
import { readingsModel } from "./schemas/models/readings.js";
import { summariesModel } from "./schemas/models/summaries.js";
import { usageNotificationsModel, } from "./schemas/models/usageNotifications.js";
import { chemFormula } from "./lib/chemFormula.js";
import { getMidnightDate } from "./lib/utils.js";
const DB_URL = process.env.DB_URL;
if (!/Dummy/.test(DB_URL)) {
    console.log("Please don't use this on your production DB :(");
    process.exit(0);
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
console.log("Generating your dummy!");
await mongoose.connect(DB_URL);
await idsModel.deleteMany();
await readingsModel.deleteMany();
await summariesModel.deleteMany();
await usageNotificationsModel.deleteMany();
let notificationId = 1;
const nowD = new Date();
nowD.setDate(nowD.getDate() - 6);
for (let d = 0; d < 7; d++) {
    // 7 hari ke belakang
    const timeSet = {};
    const n = random(35, 100);
    await new summariesModel({
        timestamp: getMidnightDate(new Date(nowD)).toISOString(),
        uptime: n * 2,
    }).save();
    let minTime = -1, maxTime = -1;
    for (let i = 0; i < n; i++) {
        const iotReadings = {
            control: random(0, 31),
            pH: random(5, 9),
            tds: random(0, 600),
            turbidity: random(0, 10),
            temperature: random(24, 30),
        };
        let timestamp = "";
        const rand = random(1, d === 6 ? (Date.now() - getMidnightDate(new Date()).getTime()) / 2 : 16 * 3600 * 1000);
        do {
            // const unix = nowD.getTime() + random(1, 23 * 3600 * 1000);
            const unix = nowD.getTime() + rand + 2000 * i;
            minTime = minTime === -1 ? unix : Math.min(minTime, unix);
            maxTime = maxTime === -1 ? unix : Math.max(maxTime, unix);
            timestamp = new Date(unix).toISOString();
        } while (timeSet[timestamp]);
        timeSet[timestamp] = true;
        await new readingsModel({
            percent: chemFormula(iotReadings),
            timestamp: timestamp,
            ...iotReadings,
        }).save();
    }
    await new usageNotificationsModel({
        notificationId: notificationId++,
        type: true,
        timestamp: new Date(minTime).toISOString(),
    }).save();
    await new usageNotificationsModel({
        notificationId: notificationId++,
        type: false,
        timestamp: new Date(maxTime).toISOString(),
    }).save();
    nowD.setDate(nowD.getDate() + 1);
}
await new idsModel({ notificationId: notificationId }).save();
await mongoose.disconnect();
console.log("ENJOY YOUR DUMMY!");
