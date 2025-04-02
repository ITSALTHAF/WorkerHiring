import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import Booking from '../models/Booking';
import User from '../models/User';
import JobPosting from '../models/JobPosting';
import Worker from '../models/Worker';
import Profile from '../models/Profile';

let clientToken, workerToken;
let clientId, workerId, jobId, bookingId;

// Test booking data
const testBooking = {
  startTime: new Date(Date.now() + 86400000), // Tomorrow
  endTime: new Date(Date.now() + 90000000),   // Tomorrow + 1 hour
  details: 'Test booking details',
  price: 120
};

describe('Bookings API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Clear collections
    await Booking.deleteMany({});
    await JobPosting.deleteMany({});
    
    // Create a client user
    const clientData = {
      email: 'client@example.com',
      password: 'Password123!',
      firstName: 'Client',
      lastName: 'User'
    };
    
    // Register client
    const clientRegisterRes = await request(app)
      .post('/api/v1/auth/register')
      .send(clientData);
    
    clientToken = clientRegisterRes.body.token;
    clientId = clientRegisterRes.body.data.id;
    
    // Create a worker user
    const workerData = {
      email: 'worker@example.com',
      password: 'Password123!',
      firstName: 'Worker',
      lastName: 'User'
    };
    
    // Register worker
    const workerRegisterRes = await request(app)
      .post('/api/v1/auth/register')
      .send(workerData);
    
    workerToken = workerRegisterRes.body.token;
    
    // Create worker profile
    const profile = await Profile.create({
      userId: workerRegisterRes.body.data.id,
      firstName: 'Worker',
      lastName: 'User',
      bio: 'Experienced worker',
      location: 'New York, NY'
    });
    
    const worker = await Worker.create({
      profileId: profile._id,
      hourlyRate: 50,
      categories: ['plumbing'],
      skills: ['faucet repair'],
      isActive: true
    });
    
    workerId = worker._id;
    
    // Create a job posting
    const jobData = {
      title: 'Test Plumbing Job',
      description: 'Fix a leaky faucet',
      category: 'plumbing',
      location: 'New York, NY',
      budget: 100,
      urgency: 'medium'
    };
    
    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(jobData);
    
    jobId = jobRes.body.data._id;
    
    // Update test booking with job and worker IDs
    testBooking.jobId = jobId;
    testBooking.workerId = workerId;
  });

  afterAll(async () => {
    // Disconnect from test database
    await mongoose.connection.close();
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a new booking when authenticated as client', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(testBooking);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('jobId', jobId);
      expect(res.body.data).toHaveProperty('workerId', workerId);
      expect(res.body.data).toHaveProperty('clientId', clientId);
      expect(res.body.data).toHaveProperty('status', 'pending');
      
      // Save booking ID for later tests
      bookingId = res.body.data._id;
    });

    it('should not create a booking when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send(testBooking);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not create a booking with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          jobId,
          workerId
          // Missing required fields
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('should get all bookings when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should not get bookings when not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/bookings');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('should get a single booking by ID when authenticated as participant', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', bookingId);
      expect(res.body.data).toHaveProperty('jobId');
      expect(res.body.data).toHaveProperty('workerId');
      expect(res.body.data).toHaveProperty('clientId', clientId);
    });

    it('should not get booking when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${bookingId}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent booking ID', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/60d0fe4f5311236168a109ca') // Random valid ObjectId
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/bookings/:id', () => {
    it('should update a booking when authenticated as participant', async () => {
      const updateData = {
        details: 'Updated booking details',
        price: 150
      };
      
      const res = await request(app)
        .put(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('details', updateData.details);
      expect(res.body.data).toHaveProperty('price', updateData.price);
    });

    it('should not update a booking when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/bookings/${bookingId}`)
        .send({ details: 'Unauthorized Update' });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/bookings/:id/cancel', () => {
    it('should cancel a booking when authenticated as client', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Test cancellation' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'cancelled');
      expect(res.body.data).toHaveProperty('cancellationReason', 'Test cancellation');
      expect(res.body.data).toHaveProperty('cancelledBy', clientId);
    });

    it('should not cancel a booking when not authenticated', async () => {
      // Create a new booking first since the previous one is already cancelled
      const newBookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(testBooking);
      
      const newBookingId = newBookingRes.body.data._id;
      
      const res = await request(app)
        .post(`/api/v1/bookings/${newBookingId}/cancel`)
        .send({ reason: 'Unauthorized cancellation' });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/bookings/my-bookings', () => {
    it('should get all bookings for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/my-bookings')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // All bookings should belong to the authenticated user
      res.body.data.forEach(booking => {
        expect(booking.clientId).toEqual(clientId);
      });
    });

    it('should not get bookings when not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/my-bookings');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
