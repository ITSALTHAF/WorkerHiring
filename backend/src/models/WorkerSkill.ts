import mongoose, { Schema, Document } from 'mongoose';
import { IWorker } from './Worker';
import { ISkill } from './Skill';

export interface IWorkerSkill extends Document {
  workerId: mongoose.Types.ObjectId | IWorker;
  skillId: mongoose.Types.ObjectId | ISkill;
  yearsOfExperience: number;
  level: 'beginner' | 'intermediate' | 'expert';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerSkillSchema: Schema = new Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    yearsOfExperience: {
      type: Number,
      required: [true, 'Please add years of experience'],
      min: [0, 'Years of experience cannot be negative'],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      required: [true, 'Please specify skill level'],
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

// Create compound index to ensure a worker can have a skill only once
WorkerSkillSchema.index({ workerId: 1, skillId: 1 }, { unique: true });

// Create indexes for common queries
WorkerSkillSchema.index({ workerId: 1 });
WorkerSkillSchema.index({ skillId: 1 });
WorkerSkillSchema.index({ level: 1 });

export default mongoose.model<IWorkerSkill>('WorkerSkill', WorkerSkillSchema);
