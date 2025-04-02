import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    coordinates?: [number, number];
  };
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, 'Please add a first name'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please add a last name'],
      trim: true,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
    },
    preferences: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for geospatial queries
ProfileSchema.index({ 'address.coordinates': '2dsphere' });

export default mongoose.model<IProfile>('Profile', ProfileSchema);
