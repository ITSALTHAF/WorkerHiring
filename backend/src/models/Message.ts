import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId | IUser;
  receiverId: mongoose.Types.ObjectId | IUser;
  content: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
    },
    attachments: [String],
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
MessageSchema.index({ conversationId: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ isRead: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
