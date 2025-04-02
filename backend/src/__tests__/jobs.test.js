import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import JobPosting from '../models/JobPosting';
import User from '../models/User';

let token;
let userId;
let jobId;

// Test job data
const testJob = {
  title: 'Test Plumbing Job',
  description: 'Fix a leaky faucet',
  category: 'plumbing',
  location: 'New York, NY',
  budget: 100,
  urgency: 'medium',
  requiredSkills: ['plumbing', 'faucet repair']
};

describe('Jobs API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Clear collections
    await JobPosting.deleteMany({});
    
    // Create a test user and get token
    const userData = {
      email: 'jobtest@example.com',
      password: 'Password123!',
      firstName: 'Job',
      lastName: 'Tester'
    };
    
    // Register user
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    token = registerRes.body.token;
    userId = registerRes.body.data.id;
  });

  afterAll(async () => {
    // Disconnect from test database
    await mongoose.connection.close();
  });

  describe('POST /api/v1/jobs', () => {
    it('should create a new job posting when authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send(testJob);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', testJob.title);
      expect(res.body.data).toHaveProperty('userId', userId);
      
      // Save job ID for later tests
      jobId = res.body.data._id;
    });

    it('should not create a job when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send(testJob);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not create a job with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test'
          // Missing required fields
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('should get all job postings', async () => {
      const res = await request(app)
        .get('/api/v1/jobs');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter jobs by query parameters', async () => {
      const res = await request(app)
        .get('/api/v1/jobs?category=plumbing&location=New York');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('category', 'plumbing');
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('should get a single job by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', jobId);
      expect(res.body.data).toHaveProperty('title', testJob.title);
    });

    it('should return 404 for non-existent job ID', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/60d0fe4f5311236168a109ca'); // Random valid ObjectId
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/jobs/:id', () => {
    it('should update a job when authenticated as owner', async () => {
      const updateData = {
        title: 'Updated Job Title',
        budget: 150
      };
      
      const res = await request(app)
        .put(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', updateData.title);
      expect(res.body.data).toHaveProperty('budget', updateData.budget);
      // Original data should remain unchanged
      expect(res.body.data).toHaveProperty('description', testJob.description);
    });

    it('should not update a job when not authenticated', async () => {
      const res = await request(app)
        .put(`/api/v1/jobs/${jobId}`)
        .send({ title: 'Unauthorized Update' });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/jobs/my-jobs', () => {
    it('should get all jobs posted by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/my-jobs')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('userId', userId);
    });

    it('should not get jobs when not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/my-jobs');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('should delete a job when authenticated as owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toEqual({});
      
      // Verify job is deleted
      const checkRes = await request(app)
        .get(`/api/v1/jobs/${jobId}`);
      
      expect(checkRes.statusCode).toEqual(404);
    });
  });
});
