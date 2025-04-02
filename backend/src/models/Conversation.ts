import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IJobPosting } from './JobPosting';
import { IBooking } from './Booking';
import { IMessage } from './Message';

export interface IConversation extends Document {
  participants: Array<mongoose.Types.ObjectId | IUser>;
  lastMessage?: mongoose.Types.ObjectId | IMessage;
  jobId?: mongoose.Types.ObjectId | IJobPosting;
  bookingId?: mongoose.Types.ObjectId | IBooking;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
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
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ jobId: 1 });
ConversationSchema.index({ bookingId: 1 });
ConversationSchema.index({ isActive: 1 });
ConversationSchema.index({ updatedAt: -1 });

// Ensure at least 2 participants in a conversation
ConversationSchema.pre('validate', function(next) {
  if (this.participants.length < 2) {
    this.invalidate('participants', 'A conversation must have at least 2 participants');
  }
  next();
});

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
