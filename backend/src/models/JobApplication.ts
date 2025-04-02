import mongoose, { Schema, Document } from 'mongoose';
import { IJobPosting } from './JobPosting';
import { IWorker } from './Worker';

export interface IJobApplication extends Document {
  jobId: mongoose.Types.ObjectId | IJobPosting;
  workerId: mongoose.Types.ObjectId | IWorker;
  coverLetter: string;
  proposedAmount: number;
  estimatedDuration: {
    value: number;
    unit: 'hour' | 'day' | 'week';
  };
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema: Schema = new Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
    coverLetter: {
      type: String,
      required: [true, 'Please add a cover letter'],
    },
    proposedAmount: {
      type: Number,
      required: [true, 'Please add a proposed amount'],
      min: [0, 'Proposed amount cannot be negative'],
    },
    estimatedDuration: {
      value: {
        type: Number,
        required: [true, 'Please add an estimated duration value'],
        min: [0, 'Duration cannot be negative'],
      },
      unit: {
        type: String,
        enum: ['hour', 'day', 'week'],
        required: [true, 'Please specify duration unit'],
      },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

// Create compound index to ensure a worker can apply to a job only once
JobApplicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true });

// Create indexes for common queries
JobApplicationSchema.index({ jobId: 1 });
JobApplicationSchema.index({ workerId: 1 });
JobApplicationSchema.index({ status: 1 });
JobApplicationSchema.index({ createdAt: -1 });

export default mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);
