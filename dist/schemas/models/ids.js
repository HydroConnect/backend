import { model, Schema } from "mongoose";
const idsSchema = new Schema({
    notificationId: { type: Number, required: true, default: 1 },
});
const idsModel = model("ids", idsSchema);
export { idsSchema, idsModel };
