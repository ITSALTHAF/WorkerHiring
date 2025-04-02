import mongoose, { Schema, Document } from 'mongoose';
import { IJobPosting } from './JobPosting';
import { IUser } from './User';
import { IWorker } from './Worker';

export interface IBooking extends Document {
  jobId: mongoose.Types.ObjectId | IJobPosting;
  clientId: mongoose.Types.ObjectId | IUser;
  workerId: mongoose.Types.ObjectId | IWorker;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cancellationReason?: string;
  cancellationPolicy?: Record<string, any>;
  location: {
    address: string;
    coordinates: [number, number];
  };
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
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
    startTime: {
      type: Date,
      required: [true, 'Please specify a start time'],
    },
    endTime: {
      type: Date,
      required: [true, 'Please specify an end time'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    cancellationReason: {
      type: String,
    },
    cancellationPolicy: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    location: {
      address: {
        type: String,
        required: [true, 'Please add a booking location'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
    },
    notes: {
      type: String,
    },
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
BookingSchema.index({ jobId: 1 });
BookingSchema.index({ clientId: 1 });
BookingSchema.index({ workerId: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ startTime: 1 });
BookingSchema.index({ 'location.coordinates': '2dsphere' });

// Add validation to ensure startTime is before endTime
BookingSchema.pre('validate', function(next) {
  if (this.startTime >= this.endTime) {
    this.invalidate('startTime', 'Start time must be before end time');
  }
  next();
});

export default mongoose.model<IBooking>('Booking', BookingSchema);
