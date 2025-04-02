import mongoose, { Schema, Document } from 'mongoose';
import { IProfile } from './Profile';

export interface IWorker extends Document {
  profileId: mongoose.Types.ObjectId | IProfile;
  title: string;
  experience: number;
  hourlyRate: number;
  availability: {
    schedule?: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
    isAvailableNow: boolean;
  };
  portfolio?: Array<{
    title: string;
    description?: string;
    images: string[];
  }>;
  certifications?: Array<{
    title: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    verificationUrl?: string;
  }>;
  averageRating: number;
  totalJobs: number;
  totalEarnings: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerSchema: Schema = new Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a professional title'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'Please add years of experience'],
      min: [0, 'Experience cannot be negative'],
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Please add your hourly rate'],
      min: [0, 'Hourly rate cannot be negative'],
    },
    availability: {
      schedule: [
        {
          day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true,
          },
          startTime: {
            type: String,
            required: true,
          },
          endTime: {
            type: String,
            required: true,
          },
        },
      ],
      isAvailableNow: {
        type: Boolean,
        default: false,
      },
    },
    portfolio: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        images: [String],
      },
    ],
    certifications: [
      {
        title: {
          type: String,
          required: true,
        },
        issuer: {
          type: String,
          required: true,
        },
        issueDate: {
          type: Date,
          required: true,
        },
        expiryDate: Date,
        verificationUrl: String,
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalJobs: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
WorkerSchema.index({ hourlyRate: 1 });
WorkerSchema.index({ averageRating: -1 });
WorkerSchema.index({ isAvailableNow: 1 });
WorkerSchema.index({ experience: -1 });

export default mongoose.model<IWorker>('Worker', WorkerSchema);
