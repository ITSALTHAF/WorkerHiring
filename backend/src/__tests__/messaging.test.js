const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

let clientToken, workerToken;
let clientId, workerId, conversationId, messageId;

describe('Messaging API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Clear collections
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    
    // Create a client user
    const clientData = {
      email: 'messaging_client@example.com',
      password: 'Password123!',
      firstName: 'Messaging',
      lastName: 'Client'
    };
    
    // Register client
    const clientRegisterRes = await request(app)
      .post('/api/v1/auth/register')
      .send(clientData);
    
    clientToken = clientRegisterRes.body.token;
    clientId = clientRegisterRes.body.data.id;
    
    // Create a worker user
    const workerData = {
      email: 'messaging_worker@example.com',
      password: 'Password123!',
      firstName: 'Messaging',
      lastName: 'Worker'
    };
    
    // Register worker
    const workerRegisterRes = await request(app)
      .post('/api/v1/auth/register')
      .send(workerData);
    
    workerToken = workerRegisterRes.body.token;
    workerId = workerRegisterRes.body.data.id;
  });

  afterAll(async () => {
    // Disconnect from test database
    await mongoose.connection.close();
  });

  describe('POST /api/v1/messaging', () => {
    it('should create a new conversation when authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/messaging')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          participantId: workerId,
          initialMessage: 'Hello, I need help with plumbing'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('participants');
      expect(res.body.data.participants).toHaveLength(2);
      expect(res.body.data).toHaveProperty('lastMessage');
      
      // Save conversation ID for later tests
      conversationId = res.body.data._id;
    });

    it('should not create a conversation when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/messaging')
        .send({
          participantId: workerId,
          initialMessage: 'Hello, I need help with plumbing'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not create a conversation with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/messaging')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          initialMessage: 'Hello, I need help with plumbing'
          // Missing participantId
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/messaging', () => {
    it('should get all conversations for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/messaging')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should not get conversations when not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/messaging');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/messaging/:id', () => {
    it('should get a single conversation by ID when authenticated as participant', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/${conversationId}`)
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('conversation');
      expect(res.body.data).toHaveProperty('messages');
      expect(res.body.data.conversation._id).toEqual(conversationId);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      
      // Save first message ID for later tests
      if (res.body.data.messages.length > 0) {
        messageId = res.body.data.messages[0]._id;
      }
    });

    it('should not get conversation when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/${conversationId}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not get conversation when not a participant', async () => {
      // Create a third user who is not part of the conversation
      const thirdUserData = {
        email: 'third_user@example.com',
        password: 'Password123!',
        firstName: 'Third',
        lastName: 'User'
      };
      
      const thirdUserRes = await request(app)
        .post('/api/v1/auth/register')
        .send(thirdUserData);
      
      const thirdUserToken = thirdUserRes.body.token;
      
      const res = await request(app)
        .get(`/api/v1/messaging/${conversationId}`)
        .set('Authorization', `Bearer ${thirdUserToken}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/messaging/:id/messages', () => {
    it('should send a message in conversation when authenticated as participant', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/${conversationId}/messages`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          content: 'I can help with your plumbing issue'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('conversationId', conversationId);
      expect(res.body.data).toHaveProperty('sender', workerId);
      expect(res.body.data).toHaveProperty('content', 'I can help with your plumbing issue');
    });

    it('should not send a message when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/${conversationId}/messages`)
        .send({
          content: 'Unauthorized message'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not send a message with empty content', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/${conversationId}/messages`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          content: ''
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/messaging/:id/read', () => {
    it('should mark conversation as read when authenticated as participant', async () => {
      const res = await request(app)
        .put(`/api/v1/messaging/${conversationId}/read`)
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should not mark conversation as read when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/messaging/${conversationId}/read`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/messaging/unread/count', () => {
    it('should get unread message count when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/unread/count')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('unreadCount');
      expect(typeof res.body.data.unreadCount).toBe('number');
    });

    it('should not get unread count when not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/unread/count');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
