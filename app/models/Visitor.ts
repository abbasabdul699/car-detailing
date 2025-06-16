import mongoose, { Schema, Document, models } from "mongoose";

export interface IVisitor extends Document {
  detailerId: mongoose.Types.ObjectId | string;
  viewedAt: Date;
  // Optionally: userId, ip, etc.
}

const VisitorSchema = new Schema<IVisitor>({
  detailerId: { type: Schema.Types.ObjectId, ref: "Detailer", required: true },
  viewedAt: { type: Date, default: Date.now },
}, { collection: "Visitor" });

export default models.Visitor || mongoose.model<IVisitor>("Visitor", VisitorSchema);
