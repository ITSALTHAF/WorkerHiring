import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Load env vars
dotenv.config();

// Socket.io setup function
const setupSocketIO = (app) => {
  // Create HTTP server
  const server = http.createServer(app);
  
  // Create Socket.io server with CORS options
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        id: user._id.toString(),
        role: user.role
      };
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });
  
  // Connection event
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Join user to their personal room
    socket.join(socket.user.id);
    
    // Join conversation
    socket.on('join-conversation', async (conversationId) => {
      try {
        // Check if conversation exists and user is a participant
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }
        
        if (!conversation.participants.includes(socket.user.id)) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }
        
        // Join the conversation room
        socket.join(conversationId);
        console.log(`User ${socket.user.id} joined conversation ${conversationId}`);
        
        // Emit typing status to other participants when user starts/stops typing
        socket.on('typing', () => {
          socket.to(conversationId).emit('typing', {
            conversationId,
            userId: socket.user.id
          });
        });
        
        socket.on('stop-typing', () => {
          socket.to(conversationId).emit('stop-typing', {
            conversationId,
            userId: socket.user.id
          });
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Leave conversation
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User ${socket.user.id} left conversation ${conversationId}`);
    });
    
    // New message
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content } = data;
        
        // Check if conversation exists
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }
        
        // Check if user is a participant
        if (!conversation.participants.includes(socket.user.id)) {
          socket.emit('error', { message: 'Not authorized to send messages in this conversation' });
          return;
        }
        
        // Create message
        const message = await Message.create({
          conversationId,
          sender: socket.user.id,
          content,
          readBy: [socket.user.id]
        });
        
        // Update conversation
        conversation.lastMessage = message._id;
        
        // Increment unread count for other participants
        if (!conversation.unreadCount) {
          conversation.unreadCount = {};
        }
        
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== socket.user.id) {
            conversation.unreadCount[participantId] = (conversation.unreadCount[participantId] || 0) + 1;
          }
        });
        
        conversation.updatedAt = Date.now();
        await conversation.save();
        
        // Populate message with sender info
        await message.populate({
          path: 'sender',
          select: 'id',
          populate: {
            path: 'profile',
            select: 'firstName lastName avatar'
          }
        });
        
        // Emit message to conversation room
        io.to(conversationId).emit('new-message', message);
        
        // Emit notification to other participants
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== socket.user.id) {
            io.to(participantId.toString()).emit('message-notification', {
              conversationId,
              message
            });
          }
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Mark messages as read
    socket.on('mark-read', async (conversationId) => {
      try {
        // Check if conversation exists
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }
        
        // Check if user is a participant
        if (!conversation.participants.includes(socket.user.id)) {
          socket.emit('error', { message: 'Not authorized to access this conversation' });
          return;
        }
        
        // Update all unread messages in this conversation
        await Message.updateMany(
          { 
            conversationId,
            sender: { $ne: socket.user.id },
            readBy: { $ne: socket.user.id }
          },
          { 
            $addToSet: { readBy: socket.user.id } 
          }
        );
        
        // Reset unread count for this user in the conversation
        await Conversation.findByIdAndUpdate(
          conversationId,
          { 
            $set: { [`unreadCount.${socket.user.id}`]: 0 } 
          }
        );
        
        // Emit read status to conversation room
        io.to(conversationId).emit('messages-read', {
          conversationId,
          userId: socket.user.id
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
  
  return { server, io };
};

export default setupSocketIO;
