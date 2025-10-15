/**
 * @todo Implements the actual code
 */
import type { HydratedDocument } from "mongoose";

export function filterMongo(mongoResult: HydratedDocument<any>[]): any[] {
    return mongoResult.map((entry: HydratedDocument<any>): any => {
        return entry;
    });
}
