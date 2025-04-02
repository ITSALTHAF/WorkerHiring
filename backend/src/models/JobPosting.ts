import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IServiceCategory } from './ServiceCategory';
import { ISkill } from './Skill';

export interface IJobPosting extends Document {
  clientId: mongoose.Types.ObjectId | IUser;
  title: string;
  description: string;
  category: mongoose.Types.ObjectId | IServiceCategory;
  requiredSkills: Array<mongoose.Types.ObjectId | ISkill>;
  location: {
    address: string;
    coordinates: [number, number];
  };
  budget: {
    minAmount: number;
    maxAmount: number;
    currency: string;
  };
  paymentType: 'hourly' | 'fixed';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  startDate: Date;
  endDate?: Date;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  attachments?: string[];
  views: number;
  applications: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobPostingSchema: Schema = new Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a job title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a job description'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
    },
    requiredSkills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    location: {
      address: {
        type: String,
        required: [true, 'Please add a job location'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
    },
    budget: {
      minAmount: {
        type: Number,
        required: [true, 'Please add a minimum budget amount'],
        min: [0, 'Budget cannot be negative'],
      },
      maxAmount: {
        type: Number,
        required: [true, 'Please add a maximum budget amount'],
        min: [0, 'Budget cannot be negative'],
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    paymentType: {
      type: String,
      enum: ['hourly', 'fixed'],
      required: [true, 'Please specify payment type'],
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'immediate'],
      default: 'medium',
    },
    startDate: {
      type: Date,
      required: [true, 'Please specify a start date'],
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    attachments: [String],
    views: {
      type: Number,
      default: 0,
    },
    applications: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
JobPostingSchema.index({ clientId: 1 });
JobPostingSchema.index({ category: 1 });
JobPostingSchema.index({ status: 1 });
JobPostingSchema.index({ 'location.coordinates': '2dsphere' });
JobPostingSchema.index({ createdAt: -1 });
JobPostingSchema.index({ 'budget.minAmount': 1, 'budget.maxAmount': 1 });
JobPostingSchema.index({ urgency: 1 });

// Add validation to ensure minAmount <= maxAmount
JobPostingSchema.pre('validate', function(next) {
  if (this.budget.minAmount > this.budget.maxAmount) {
    this.invalidate('budget.minAmount', 'Minimum amount cannot be greater than maximum amount');
  }
  next();
});

export default mongoose.model<IJobPosting>('JobPosting', JobPostingSchema);
