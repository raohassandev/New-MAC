import request from 'supertest';
import { app } from '../../server';
import Profile from '../../client/models/Profile';
import User from '../../client/models/User';
import jwt from 'jsonwebtoken';
// Import the mock mongoose
import { mongoose } from '../mocks/mongoose.mock.js';

describe('Profile API Endpoints', () => {
  let token: string;
  let adminUser: any;
  const testProfiles = [
    {
      name: 'Test Profile 1',
      description: 'First test profile',
      settings: {
        temperature: 22,
        mode: 'auto',
        enabled: true,
      },
      isDeviceDriver: false,
    },
    {
      name: 'Test Profile 2',
      description: 'Second test profile',
      settings: {
        temperature: 25,
        mode: 'cooling',
        enabled: false,
      },
      isDeviceDriver: true,
    },
  ];
  let profileIds: string[] = [];

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/macsys_test');
    
    // Create a test admin user
    adminUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      permissions: [
        'manage_devices',
        'manage_profiles',
        'manage_users',
        'view_analytics',
        'view_devices',
        'view_profiles',
      ],
    });
    
    // Generate a valid JWT for the admin user
    token = jwt.sign(
      { id: adminUser._id },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
    
    // Create test profiles
    const profiles = await Profile.insertMany(testProfiles);
    profileIds = profiles.map(p => p._id.toString());
  });

  afterAll(async () => {
    // Clean up test data
    await Profile.deleteMany({});
    await User.deleteMany({});
    
    // Close database connection
    await mongoose.connection.close();
  });

  describe('GET /api/profiles', () => {
    test('should return all profiles', async () => {
      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('description');
      expect(res.body[0]).toHaveProperty('settings');
    });

    test('should require authentication', async () => {
      const res = await request(app).get('/api/profiles');
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/profiles/:id', () => {
    test('should return a single profile by ID', async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileIds[0]}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id', profileIds[0]);
      expect(res.body).toHaveProperty('name', 'Test Profile 1');
      expect(res.body).toHaveProperty('description', 'First test profile');
      expect(res.body.settings).toHaveProperty('temperature', 22);
    });

    test('should return 404 for non-existent profile', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const res = await request(app)
        .get(`/api/profiles/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('POST /api/profiles', () => {
    test('should create a new profile', async () => {
      const newProfile = {
        name: 'Test Profile 3',
        description: 'Third test profile',
        settings: {
          temperature: 20,
          mode: 'heating',
          enabled: true,
        },
        isTemplate: false,
      };
      
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(newProfile);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'Test Profile 3');
      expect(res.body).toHaveProperty('description', 'Third test profile');
      expect(res.body.settings).toHaveProperty('temperature', 20);
      
      // Store the new profile ID for cleanup
      profileIds.push(res.body._id);
    });

    test('should validate required fields', async () => {
      const invalidProfile = {
        // Missing required 'name' field
        description: 'Invalid profile',
        settings: {},
      };
      
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidProfile);
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('validation failed');
    });
  });

  describe('PUT /api/profiles/:id', () => {
    test('should update an existing profile', async () => {
      const updatedData = {
        name: 'Updated Profile 1',
        settings: {
          temperature: 23,
        },
      };
      
      const res = await request(app)
        .put(`/api/profiles/${profileIds[0]}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Profile 1');
      expect(res.body.settings).toHaveProperty('temperature', 23);
      expect(res.body.settings).toHaveProperty('mode', 'auto'); // Original field should be preserved
    });

    test('should return 404 for non-existent profile', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const res = await request(app)
        .put(`/api/profiles/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Does not exist' });
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    test('should delete an existing profile', async () => {
      const res = await request(app)
        .delete(`/api/profiles/${profileIds[1]}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Profile removed');
      expect(res.body).toHaveProperty('id', profileIds[1]);
      
      // Verify profile was deleted
      const checkProfile = await Profile.findById(profileIds[1]);
      expect(checkProfile).toBeNull();
    });

    test('should return 404 for non-existent profile', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const res = await request(app)
        .delete(`/api/profiles/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('POST /api/profiles/:id/apply', () => {
    test('should attempt to apply profile to devices', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileIds[0]}/apply`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Profile applied');
    });

    test('should return 404 for non-existent profile', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const res = await request(app)
        .post(`/api/profiles/${fakeId}/apply`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });
});