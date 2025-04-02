import mongoose, { Schema, Document } from 'mongoose';
import { IBooking } from './Booking';
import { IUser } from './User';
import { IWorker } from './Worker';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId | IBooking;
  clientId: mongoose.Types.ObjectId | IUser;
  workerId: mongoose.Types.ObjectId | IWorker;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  escrowReleaseDate?: Date;
  platformFee: number;
  taxAmount: number;
  invoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add payment amount'],
      min: [0, 'Payment amount cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Please specify currency'],
      default: 'USD',
    },
    paymentMethod: {
      type: String,
      required: [true, 'Please specify payment method'],
    },
    transactionId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    escrowReleaseDate: {
      type: Date,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    invoiceUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ clientId: 1 });
PaymentSchema.index({ workerId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
