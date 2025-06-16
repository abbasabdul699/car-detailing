import mongoose, { Schema, Document, models } from "mongoose";

export interface IImage extends Document {
  url: string;
  alt?: string;
  type: string; // "profile" or "portfolio"
  detailerId: mongoose.Types.ObjectId;
}

const ImageSchema = new Schema<IImage>({
  url: { type: String, required: true },
  alt: { type: String },
  type: { type: String, required: true },
  detailerId: { type: Schema.Types.ObjectId, ref: "Detailer", required: true },
}, { collection: "Image" });

export default models.Image || mongoose.model<IImage>("Image", ImageSchema);
