import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';

// Mock user data
const testUser = {
  email: 'test@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User'
};

let token;

describe('Auth API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Clear users collection
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Disconnect from test database
    await mongoose.connection.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email', testUser.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should not register a user with an existing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should not register a user with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      
      // Save token for protected route tests
      token = res.body.token;
    });

    it('should not login a user with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email', testUser.email);
    });

    it('should not get profile when not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send password reset token if email exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: testUser.email
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });

    it('should return 404 if email does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  // Additional tests for reset password, update details, etc. would go here
});
