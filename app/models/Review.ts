import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['user', 'detailer'],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  serviceType: String,
  businessLocation: String,
  memberSince: String,
});

export default mongoose.models.Review || mongoose.model('Review', reviewSchema); 