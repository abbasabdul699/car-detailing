import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitor extends Document {
  detailerId: string;
  viewedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

const VisitorSchema: Schema = new Schema({
  detailerId: {
    type: String,
    required: true,
    index: true
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  referrer: {
    type: String
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
VisitorSchema.index({ detailerId: 1, viewedAt: 1 });

export default mongoose.models.Visitor || mongoose.model<IVisitor>('Visitor', VisitorSchema);
