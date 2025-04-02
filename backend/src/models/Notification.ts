import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: [true, 'Please specify notification type'],
    },
    title: {
      type: String,
      required: [true, 'Please add a notification title'],
    },
    message: {
      type: String,
      required: [true, 'Please add a notification message'],
    },
    data: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ type: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
