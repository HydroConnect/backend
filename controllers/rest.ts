import type { Request, Response } from "express";

import { Router } from "express";
import { summariesModel } from "../schemas/models/summaries.js";
import { filterMongo } from "../lib/filterMongo.js";

const restRouter = Router();

restRouter.get("/summary", async (req: Request, res: Response) => {
    const summary = await summariesModel.find().limit(7);
    res.json(filterMongo(summary));
});

export { restRouter };
