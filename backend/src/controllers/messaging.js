import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import mongoose from 'mongoose';

// @desc    Get all conversations for current user
// @route   GET /api/v1/messaging
// @access  Private
export const getConversations = asyncHandler(async (req, res, next) => {
  // Find conversations where user is a participant
  const conversations = await Conversation.find({
    participants: { $in: [req.user.id] }
  })
    .populate({
      path: 'participants',
      select: 'id',
      populate: {
        path: 'profile',
        select: 'firstName lastName avatar'
      }
    })
    .populate({
      path: 'lastMessage'
    })
    .sort('-updatedAt');

  // Format conversations for response
  const formattedConversations = conversations.map(conversation => {
    // Get the other participant (not the current user)
    const otherParticipant = conversation.participants.find(
      participant => participant._id.toString() !== req.user.id
    );

    // Get unread count for current user
    const unreadCount = conversation.unreadCount && conversation.unreadCount[req.user.id] 
      ? conversation.unreadCount[req.user.id] 
      : 0;

    return {
      id: conversation._id,
      otherParticipant,
      lastMessage: conversation.lastMessage,
      unreadCount,
      updatedAt: conversation.updatedAt,
      jobId: conversation.jobId
    };
  });

  res.status(200).json({
    success: true,
    count: formattedConversations.length,
    data: formattedConversations
  });
});

// @desc    Get single conversation
// @route   GET /api/v1/messaging/:id
// @access  Private
export const getConversation = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate({
      path: 'participants',
      select: 'id',
      populate: {
        path: 'profile',
        select: 'firstName lastName avatar'
      }
    });

  if (!conversation) {
    return next(
      new ErrorResponse(`Conversation not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is a participant
  if (!conversation.participants.some(participant => 
    participant._id.toString() === req.user.id
  )) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this conversation`,
        401
      )
    );
  }

  // Get messages for this conversation
  const messages = await Message.find({ conversationId: conversation._id })
    .sort('createdAt');

  // Mark messages as read
  await markMessagesAsRead(conversation._id, req.user.id);

  res.status(200).json({
    success: true,
    data: {
      conversation,
      messages
    }
  });
});

// @desc    Create new conversation
// @route   POST /api/v1/messaging
// @access  Private
export const createConversation = asyncHandler(async (req, res, next) => {
  const { participantId, jobId, initialMessage } = req.body;

  if (!participantId) {
    return next(
      new ErrorResponse('Please provide a participant ID', 400)
    );
  }

  // Check if participant exists
  const participant = await User.findById(participantId);

  if (!participant) {
    return next(
      new ErrorResponse(`User not found with id of ${participantId}`, 404)
    );
  }

  // Check if conversation already exists between these users
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user.id, participantId] },
    jobId: jobId || { $exists: false }
  });

  // If conversation doesn't exist, create it
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user.id, participantId],
      jobId,
      unreadCount: {
        [participantId]: initialMessage ? 1 : 0
      }
    });
  }

  // If initial message provided, create it
  if (initialMessage) {
    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.user.id,
      content: initialMessage,
      readBy: [req.user.id]
    });

    // Update conversation with last message
    conversation.lastMessage = message._id;
    
    // Increment unread count for recipient
    if (!conversation.unreadCount) {
      conversation.unreadCount = {};
    }
    conversation.unreadCount[participantId] = (conversation.unreadCount[participantId] || 0) + 1;
    
    await conversation.save();
  }

  // Populate conversation
  await conversation.populate({
    path: 'participants',
    select: 'id',
    populate: {
      path: 'profile',
      select: 'firstName lastName avatar'
    }
  });

  if (conversation.lastMessage) {
    await conversation.populate('lastMessage');
  }

  res.status(201).json({
    success: true,
    data: conversation
  });
});

// @desc    Send message in conversation
// @route   POST /api/v1/messaging/:id/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    return next(
      new ErrorResponse('Please provide message content', 400)
    );
  }

  // Check if conversation exists
  const conversation = await Conversation.findById(req.params.id);

  if (!conversation) {
    return next(
      new ErrorResponse(`Conversation not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is a participant
  if (!conversation.participants.includes(req.user.id)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to send messages in this conversation`,
        401
      )
    );
  }

  // Create message
  const message = await Message.create({
    conversationId: conversation._id,
    sender: req.user.id,
    content,
    readBy: [req.user.id]
  });

  // Update conversation
  conversation.lastMessage = message._id;
  
  // Increment unread count for other participants
  if (!conversation.unreadCount) {
    conversation.unreadCount = {};
  }
  
  conversation.participants.forEach(participantId => {
    if (participantId.toString() !== req.user.id) {
      conversation.unreadCount[participantId] = (conversation.unreadCount[participantId] || 0) + 1;
    }
  });
  
  conversation.updatedAt = Date.now();
  await conversation.save();

  // In a real-time implementation, we would emit a socket event here
  // to notify the recipient of the new message

  res.status(201).json({
    success: true,
    data: message
  });
});

// @desc    Mark conversation as read
// @route   PUT /api/v1/messaging/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res, next) => {
  // Check if conversation exists
  const conversation = await Conversation.findById(req.params.id);

  if (!conversation) {
    return next(
      new ErrorResponse(`Conversation not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is a participant
  if (!conversation.participants.includes(req.user.id)) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this conversation`,
        401
      )
    );
  }

  // Mark messages as read
  await markMessagesAsRead(conversation._id, req.user.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get unread message count
// @route   GET /api/v1/messaging/unread/count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res, next) => {
  // Find conversations where user is a participant
  const conversations = await Conversation.find({
    participants: { $in: [req.user.id] }
  });

  // Calculate total unread count
  let totalUnread = 0;
  conversations.forEach(conversation => {
    if (conversation.unreadCount && conversation.unreadCount[req.user.id]) {
      totalUnread += conversation.unreadCount[req.user.id];
    }
  });

  res.status(200).json({
    success: true,
    data: {
      unreadCount: totalUnread
    }
  });
});

// Helper function to mark messages as read
const markMessagesAsRead = async (conversationId, userId) => {
  // Update all unread messages in this conversation
  await Message.updateMany(
    { 
      conversationId,
      sender: { $ne: userId },
      readBy: { $ne: userId }
    },
    { 
      $addToSet: { readBy: userId } 
    }
  );

  // Reset unread count for this user in the conversation
  await Conversation.findByIdAndUpdate(
    conversationId,
    { 
      $set: { [`unreadCount.${userId}`]: 0 } 
    }
  );
};
