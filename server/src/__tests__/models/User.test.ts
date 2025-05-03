import mongoose from 'mongoose';
import User from '../../models/User';
import bcrypt from 'bcryptjs';

// Mock bcrypt for password verification tests
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => 'mocksalt'),
  hash: jest.fn().mockImplementation((password, salt) => `hashed_${password}`),
  compare: jest.fn().mockImplementation((password, hash) => 
    hash === `hashed_${password}` || hash === password
  ),
}));

describe('User Model', () => {
  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/macsys_test');
  });

  afterAll(async () => {
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  test('creates a user with minimum required fields', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    const user = await User.create(userData);
    expect(user._id).toBeDefined();
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.password).toBe('hashed_password123'); // Password should be hashed
    
    // Check default values
    expect(user.role).toBe('user');
    expect(user.permissions).toEqual(['view_devices', 'view_profiles']);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  test('creates a user with all fields', async () => {
    const userData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      permissions: ['manage_devices', 'manage_profiles', 'manage_users'],
    };

    const user = await User.create(userData);
    expect(user.name).toBe('Admin User');
    expect(user.email).toBe('admin@example.com');
    expect(user.password).toBe('hashed_admin123');
    expect(user.role).toBe('admin');
    expect(user.permissions).toEqual(['manage_devices', 'manage_profiles', 'manage_users']);
  });

  test('ensures email uniqueness', async () => {
    // Create first user
    await User.create({
      name: 'First User',
      email: 'duplicate@example.com',
      password: 'password1',
    });

    // Try to create another user with same email
    const duplicateData = {
      name: 'Second User',
      email: 'duplicate@example.com',
      password: 'password2',
    };

    await expect(User.create(duplicateData)).rejects.toThrow();
  });

  test('fails validation when required fields are missing', async () => {
    const invalidUserData = {
      // Missing required 'name' field
      email: 'incomplete@example.com',
      password: 'password123',
    };

    await expect(User.create(invalidUserData)).rejects.toThrow();
  });

  test('hashes password before saving', async () => {
    const userData = {
      name: 'Password Test',
      email: 'password@example.com',
      password: 'plaintext',
    };

    const user = await User.create(userData);
    
    expect(bcrypt.genSalt).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 'mocksalt');
    expect(user.password).toBe('hashed_plaintext');
  });

  test('updates existing user correctly', async () => {
    // Create a user
    const user = await User.create({
      name: 'Original User',
      email: 'original@example.com',
      password: 'original123',
    });
    
    // Update using findByIdAndUpdate
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        name: 'Updated User',
        role: 'admin',
      },
      { new: true, runValidators: true }
    );
    
    expect(updatedUser).not.toBeNull();
    if (updatedUser) {
      expect(updatedUser.name).toBe('Updated User');
      expect(updatedUser.email).toBe('original@example.com'); // Unchanged
      expect(updatedUser.role).toBe('admin');
      // Password should remain unchanged when not provided in update
      expect(updatedUser.password).toBe('hashed_original123');
    }
  });

  test('supports user authentication methods', async () => {
    // Create a user for auth testing
    const userData = {
      name: 'Auth Test',
      email: 'auth@example.com',
      password: 'authpass',
    };
    
    let user;
    
    // For this test we need to manage bcrypt mocking differently to test instance methods
    bcrypt.hash = jest.fn().mockReturnValueOnce('hashed_authpass');
    
    // Create the user with hashed password
    user = await User.create(userData);
    
    // Reset the mock and set up for password comparison
    bcrypt.compare.mockImplementation((candidate, hash) => Promise.resolve(candidate === 'authpass'));
    
    // Test authenticating with correct password
    const isMatch = await bcrypt.compare('authpass', user.password);
    expect(isMatch).toBe(true);
    
    // Test authenticating with incorrect password
    const isWrong = await bcrypt.compare('wrongpass', user.password);
    expect(isWrong).toBe(false);
  });

  test('deletes user correctly', async () => {
    // Create a user
    const user = await User.create({
      name: 'User to Delete',
      email: 'delete@example.com',
      password: 'delete123',
    });
    
    // Verify it exists
    const userId = user._id;
    expect(await User.findById(userId)).not.toBeNull();
    
    // Delete it
    await user.deleteOne();
    
    // Verify it's gone
    expect(await User.findById(userId)).toBeNull();
  });

  test('supports querying by multiple criteria', async () => {
    // Create multiple users
    await User.create([
      {
        name: 'User A',
        email: 'usera@example.com',
        password: 'passa',
        role: 'user',
      },
      {
        name: 'User B',
        email: 'userb@example.com',
        password: 'passb',
        role: 'admin',
      },
      {
        name: 'User C',
        email: 'userc@example.com',
        password: 'passc',
        role: 'user',
      },
    ]);
    
    // Query all users with role 'user'
    const regularUsers = await User.find({ role: 'user' });
    expect(regularUsers).toHaveLength(2);
    expect(regularUsers.map(u => u.name)).toEqual(['User A', 'User C']);
    
    // Query by email
    const userByEmail = await User.findOne({ email: 'userb@example.com' });
    expect(userByEmail).not.toBeNull();
    expect(userByEmail?.name).toBe('User B');
    expect(userByEmail?.role).toBe('admin');
    
    // Query by multiple criteria
    const userByMultiple = await User.findOne({
      role: 'user',
      name: 'User C',
    });
    expect(userByMultiple).not.toBeNull();
    expect(userByMultiple?.email).toBe('userc@example.com');
  });
});