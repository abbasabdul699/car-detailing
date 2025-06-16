import mongoose, { Schema, Document, models } from "mongoose";

export interface IDetailer extends Document {
  email: string;
  password: string;
  businessName?: string;
  // Add other fields as needed
}

const DetailerSchema = new Schema<IDetailer>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  businessName: { type: String },
  // Add other fields here
}, { collection: "Detailer" });

export default models.Detailer || mongoose.model<IDetailer>("Detailer", DetailerSchema);
