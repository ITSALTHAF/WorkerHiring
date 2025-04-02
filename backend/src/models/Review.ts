import mongoose, { Schema, Document } from 'mongoose';
import { IBooking } from './Booking';
import { IUser } from './User';

export interface IReview extends Document {
  bookingId: mongoose.Types.ObjectId | IBooking;
  reviewerId: mongoose.Types.ObjectId | IUser;
  receiverId: mongoose.Types.ObjectId | IUser;
  rating: number;
  comment: string;
  reply?: string;
  attachments?: string[];
  isFlagged: boolean;
  flagReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please add a rating'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Please add a review comment'],
    },
    reply: {
      type: String,
    },
    attachments: [String],
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index to ensure one review per booking per reviewer-receiver pair
ReviewSchema.index({ bookingId: 1, reviewerId: 1, receiverId: 1 }, { unique: true });

// Create indexes for common queries
ReviewSchema.index({ bookingId: 1 });
ReviewSchema.index({ reviewerId: 1 });
ReviewSchema.index({ receiverId: 1 });
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ isFlagged: 1 });

export default mongoose.model<IReview>('Review', ReviewSchema);
