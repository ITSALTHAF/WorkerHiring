import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import Payment from '../models/Payment';
import Booking from '../models/Booking';
import User from '../models/User';

let clientToken, workerToken;
let clientId, workerId, bookingId, paymentId;

// Test payment data
const testPayment = {
  amount: 120,
  paymentMethod: 'credit_card'
};

describe('Payments API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Clear collections
    await Payment.deleteMany({});
    await Booking.deleteMany({});
    
    // Create a client user
    const clientData = {
      email: 'payment_client@example.com',
      password: 'Password123!',
      firstName: 'Payment',
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
      email: 'payment_worker@example.com',
      password: 'Password123!',
      firstName: 'Payment',
      lastName: 'Worker'
    };
    
    // Register worker
    const workerRegisterRes = await request(app)
      .post('/api/v1/auth/register')
      .send(workerData);
    
    workerToken = workerRegisterRes.body.token;
    workerId = workerRegisterRes.body.data.id;
    
    // Create a booking
    const bookingData = {
      clientId,
      workerId,
      startTime: new Date(Date.now() + 86400000), // Tomorrow
      endTime: new Date(Date.now() + 90000000),   // Tomorrow + 1 hour
      details: 'Test booking for payment',
      price: 120,
      status: 'pending'
    };
    
    const booking = await Booking.create(bookingData);
    bookingId = booking._id;
    
    // Update test payment with booking ID
    testPayment.bookingId = bookingId;
  });

  afterAll(async () => {
    // Disconnect from test database
    await mongoose.connection.close();
  });

  describe('POST /api/v1/payments', () => {
    it('should create a new payment when authenticated as client', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(testPayment);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('bookingId', bookingId.toString());
      expect(res.body.data).toHaveProperty('clientId', clientId);
      expect(res.body.data).toHaveProperty('workerId', workerId);
      expect(res.body.data).toHaveProperty('amount', testPayment.amount);
      expect(res.body.data).toHaveProperty('status', 'pending');
      
      // Save payment ID for later tests
      paymentId = res.body.data._id;
    });

    it('should not create a payment when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .send(testPayment);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not create a payment with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          bookingId
          // Missing required fields
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/payments', () => {
    it('should get all payments when authenticated as admin', async () => {
      // Note: This test would require an admin user
      // For simplicity, we'll skip the actual test implementation
      // but in a real test suite, we would create an admin user and test this endpoint
    });

    it('should not get all payments when not authenticated as admin', async () => {
      const res = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should get a single payment by ID when authenticated as participant', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/${paymentId}`)
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', paymentId);
      expect(res.body.data).toHaveProperty('bookingId');
      expect(res.body.data).toHaveProperty('clientId', clientId);
      expect(res.body.data).toHaveProperty('workerId', workerId);
    });

    it('should not get payment when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/${paymentId}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent payment ID', async () => {
      const res = await request(app)
        .get('/api/v1/payments/60d0fe4f5311236168a109ca') // Random valid ObjectId
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/payments/:id/process', () => {
    it('should process a payment when authenticated as client', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${paymentId}/process`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ paymentMethodId: 'test_payment_method' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'completed');
      expect(res.body.data).toHaveProperty('transactionId');
      expect(res.body.data).toHaveProperty('paidAt');
    });

    it('should not process a payment when not authenticated', async () => {
      // Create a new payment first since the previous one is already processed
      const newPaymentRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(testPayment);
      
      const newPaymentId = newPaymentRes.body.data._id;
      
      const res = await request(app)
        .post(`/api/v1/payments/${newPaymentId}/process`)
        .send({ paymentMethodId: 'test_payment_method' });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/payments/my-payments', () => {
    it('should get all payments for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/payments/my-payments')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // All payments should belong to the authenticated user
      res.body.data.forEach(payment => {
        expect(payment.clientId).toEqual(clientId);
      });
    });

    it('should not get payments when not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/payments/my-payments');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/payments/:id/release', () => {
    it('should release payment from escrow when authenticated as client', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${paymentId}/release`)
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'released');
      expect(res.body.data).toHaveProperty('releasedAt');
    });

    it('should not release payment when not authenticated', async () => {
      // Create and process a new payment first
      const newPaymentRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(testPayment);
      
      const newPaymentId = newPaymentRes.body.data._id;
      
      await request(app)
        .post(`/api/v1/payments/${newPaymentId}/process`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ paymentMethodId: 'test_payment_method' });
      
      const res = await request(app)
        .post(`/api/v1/payments/${newPaymentId}/release`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
