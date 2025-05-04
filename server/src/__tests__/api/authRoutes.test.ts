import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import User from '../../client/models/User';
import bcrypt from 'bcryptjs';

describe('Auth API Endpoints', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/macsys_test');
    
    // Create a test user with a known password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('testpassword', salt);
    
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      permissions: ['view_devices', 'view_profiles'],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    
    // Close database connection
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      };
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'New User');
      expect(res.body).toHaveProperty('email', 'newuser@example.com');
      expect(res.body).toHaveProperty('token');
      expect(res.body).not.toHaveProperty('password'); // Password should not be returned
      
      // Verify default permissions
      expect(res.body).toHaveProperty('permissions');
      expect(res.body.permissions).toContain('view_devices');
      expect(res.body.permissions).toContain('view_profiles');
    });

    test('should require all fields', async () => {
      const incompleteData = {
        name: 'Incomplete User',
        // Missing email and password
      };
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(incompleteData);
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Please fill all fields');
    });

    test('should prevent duplicate email registration', async () => {
      const duplicateData = {
        name: 'Duplicate User',
        email: 'test@example.com', // Already exists
        password: 'password123',
      };
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(duplicateData);
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword',
      };
      
      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'Test User');
      expect(res.body).toHaveProperty('email', 'test@example.com');
      expect(res.body).toHaveProperty('token');
      expect(res.body).not.toHaveProperty('password');
    });

    test('should reject invalid email', async () => {
      const invalidData = {
        email: 'nonexistent@example.com',
        password: 'testpassword',
      };
      
      const res = await request(app)
        .post('/api/auth/login')
        .send(invalidData);
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid credentials');
    });

    test('should reject invalid password', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      
      const res = await request(app)
        .post('/api/auth/login')
        .send(invalidData);
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;
    
    beforeAll(async () => {
      // Get a valid token by logging in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        });
      
      token = loginRes.body.token;
    });
    
    test('should return current user data', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'Test User');
      expect(res.body).toHaveProperty('email', 'test@example.com');
      expect(res.body).not.toHaveProperty('password');
    });

    test('should require authentication', async () => {
      const res = await request(app).get('/api/auth/me');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Not authorized');
    });

    test('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid token');
    });
  });
});