import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCategory extends Document {
  name: string;
  description?: string;
  icon?: string;
  parentCategory?: mongoose.Types.ObjectId | IServiceCategory;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceCategorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
ServiceCategorySchema.index({ name: 1 });
ServiceCategorySchema.index({ parentCategory: 1 });
ServiceCategorySchema.index({ isActive: 1 });

export default mongoose.model<IServiceCategory>('ServiceCategory', ServiceCategorySchema);
