import { model, Schema } from "mongoose";

interface iIds {
    notificationId: number;
}

const idsSchema = new Schema({
    notificationId: { type: Number, required: true, default: 1 },
});

const idsModel = model("ids", idsSchema);
export { idsSchema, idsModel };
export type { iIds };
