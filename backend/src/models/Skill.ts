import mongoose, { Schema, Document } from 'mongoose';
import { IServiceCategory } from './ServiceCategory';

export interface ISkill extends Document {
  name: string;
  category: mongoose.Types.ObjectId | IServiceCategory;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a skill name'],
      trim: true,
      unique: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: [true, 'Please specify a category for this skill'],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
SkillSchema.index({ name: 1 });
SkillSchema.index({ category: 1 });

export default mongoose.model<ISkill>('Skill', SkillSchema);
