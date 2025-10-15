import { it, describe, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { readingsModel } from "../models/readings.js";
import { summariesModel } from "../models/summaries.js";
import { assert } from "console";

dotenv.config({ path: path.resolve(__dirname, "../.d.env") });

const READINGS_N = 10;
const SUMMARIES_N = 5;
assert(SUMMARIES_N < READINGS_N);
const READINGS_ARR: InstanceType<typeof readingsModel>[] = [];
const SUMMARIES_ARR: InstanceType<typeof summariesModel>[] = [];

beforeAll(async () => {
    await mongoose.connect(process.env.DB_URL!);
    await readingsModel.deleteMany();
    for (let i = 0; i < READINGS_N; i++) {
        READINGS_ARR.push(
            new readingsModel({
                percent: 0.5,
                pH: 7,
                tds: 6,
                temperature: 10,
                turbidity: 10,
            })
        );
        await READINGS_ARR[i]!.save();
    }

    await summariesModel.deleteMany();
    for (let i = 0; i < SUMMARIES_N; i++) {
        SUMMARIES_ARR.push(
            new summariesModel({
                min: READINGS_ARR[i]!.toObject(),
                max: READINGS_ARR[i + 1]!.toObject(),
            })
        );
        await SUMMARIES_ARR[i]!.save();
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

/**
 * @todo Implements the actual code
 */
describe("/rest/v1/summary", () => {
    it("Run!", () => {
        expect(1 + 1).toEqual(2);
    });
});
