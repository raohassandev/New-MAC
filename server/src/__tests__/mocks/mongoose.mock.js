// Mock for Mongoose models and related functionality
// This approach uses jest.mock() with a factory pattern to create
// proper mock instances that mimic Mongoose's behavior

const mockUserData = new Map();
const mockDeviceData = new Map();
const mockProfileData = new Map();

// Generate ObjectId
const generateObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const machineId = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  const processId = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
  const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  return timestamp + machineId + processId + counter;
};

// Create Mongoose mock implementation
const mongoose = {
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    db: {
      dropDatabase: jest.fn().mockResolvedValue(true),
    },
    close: jest.fn().mockResolvedValue(true),
  },
  Schema: jest.fn().mockReturnValue({}),
  model: jest.fn().mockImplementation((modelName) => {
    switch (modelName) {
      case 'User':
        return mockUserModel;
      case 'Device':
        return mockDeviceModel;
      case 'Profile':
        return mockProfileModel;
      default:
        return { name: modelName };
    }
  }),
};

// Mock Document instance methods for all models
class MockDocument {
  constructor(data) {
    Object.assign(this, data);
    this._id = generateObjectId();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  
  save() {
    this.updatedAt = new Date();
    return Promise.resolve(this);
  }
  
  deleteOne() {
    const modelStore = this.constructor.mockStore;
    if (modelStore) {
      modelStore.delete(this._id.toString());
    }
    return Promise.resolve({ acknowledged: true, deletedCount: 1 });
  }
}

// User model mock
const mockUserModel = {
  mockStore: mockUserData,
  
  create: jest.fn().mockImplementation(async (data) => {
    // Handle array or single document
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => mockUserModel.create(item)));
    }
    
    // Handle unique email validation
    const existingEmail = Array.from(mockUserData.values()).find(user => user.email === data.email);
    if (existingEmail) {
      const error = new Error('Duplicate key error');
      error.name = 'MongoError';
      error.code = 11000;
      return Promise.reject(error);
    }
    
    // Check required fields
    if (!data.name || !data.email || !data.password) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    }
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password);
    
    const doc = new MockDocument({
      ...data, 
      password: hashedPassword,
      role: data.role || 'user',
      permissions: data.permissions || ['view_devices', 'view_profiles']
    });
    
    doc.constructor = { mockStore: mockUserData };
    mockUserData.set(doc._id.toString(), doc);
    return Promise.resolve(doc);
  }),
  
  find: jest.fn().mockImplementation((query = {}) => {
    const matchingDocs = Array.from(mockUserData.values()).filter(doc => {
      return Object.entries(query).every(([key, value]) => doc[key] === value);
    });
    return {
      exec: jest.fn().mockResolvedValue(matchingDocs),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
  }),
  
  findOne: jest.fn().mockImplementation((query = {}) => {
    const doc = Array.from(mockUserData.values()).find(doc => {
      return Object.entries(query).every(([key, value]) => doc[key] === value);
    });
    return {
      exec: jest.fn().mockResolvedValue(doc || null),
      select: jest.fn().mockImplementation(fields => {
        if (!doc) return { exec: jest.fn().mockResolvedValue(null) };
        if (fields && fields.startsWith('-')) {
          const fieldToExclude = fields.substring(1);
          const newDoc = {...doc};
          delete newDoc[fieldToExclude];
          return { exec: jest.fn().mockResolvedValue(newDoc) };
        }
        return { exec: jest.fn().mockResolvedValue(doc) };
      }),
    };
  }),
  
  findById: jest.fn().mockImplementation((id) => {
    const doc = mockUserData.get(id.toString());
    return {
      exec: jest.fn().mockResolvedValue(doc || null),
      select: jest.fn().mockImplementation(fields => {
        if (!doc) return { exec: jest.fn().mockResolvedValue(null) };
        if (fields && fields.startsWith('-')) {
          const fieldToExclude = fields.substring(1);
          const newDoc = {...doc};
          delete newDoc[fieldToExclude];
          return { exec: jest.fn().mockResolvedValue(newDoc) };
        }
        return doc || null;
      }),
    };
  }),
  
  findByIdAndUpdate: jest.fn().mockImplementation((id, update, options) => {
    const doc = mockUserData.get(id.toString());
    if (!doc) return Promise.resolve(null);
    
    const updatedDoc = { ...doc, ...update, updatedAt: new Date() };
    mockUserData.set(id.toString(), updatedDoc);
    
    return Promise.resolve(options?.new === true ? updatedDoc : doc);
  }),
  
  deleteMany: jest.fn().mockImplementation(() => {
    mockUserData.clear();
    return Promise.resolve({ acknowledged: true, deletedCount: mockUserData.size });
  }),
};

// Device model mock
const mockDeviceModel = {
  mockStore: mockDeviceData,
  
  create: jest.fn().mockImplementation(async (data) => {
    // Handle array or single document
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => mockDeviceModel.create(item)));
    }
    
    // Check required fields
    if (!data.name) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    }
    
    // Create a proper mock device document
    const doc = {
      _id: generateObjectId(),
      ...data,
      enabled: data.enabled !== undefined ? data.enabled : true,
      registers: data.registers || [],
      dataPoints: data.dataPoints || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Add instance methods
      save: jest.fn().mockImplementation(function() {
        this.updatedAt = new Date();
        return Promise.resolve(this);
      }),
      
      deleteOne: jest.fn().mockImplementation(function() {
        mockDeviceData.delete(this._id.toString());
        return Promise.resolve({ acknowledged: true, deletedCount: 1 });
      }),
    };
    
    mockDeviceData.set(doc._id.toString(), doc);
    return Promise.resolve(doc);
  }),
  
  find: jest.fn().mockImplementation((query = {}) => {
    // Deep query match function for nested objects
    const matchesQuery = (doc, query) => {
      return Object.entries(query).every(([key, value]) => {
        // Handle nested paths like 'connectionSetting.tcp.ip'
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = doc;
          
          // Navigate down the object path
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current || typeof current !== 'object') return false;
            current = current[parts[i]];
          }
          
          // Check the final property
          return current && current[parts[parts.length - 1]] === value;
        }
        
        return doc[key] === value;
      });
    };
    
    const matchingDocs = Array.from(mockDeviceData.values()).filter(doc => matchesQuery(doc, query));
    return matchingDocs; // Return array directly for tests
  }),
  
  findById: jest.fn().mockImplementation((id) => {
    return Promise.resolve(mockDeviceData.get(id.toString()) || null);
  }),
  
  findByIdAndUpdate: jest.fn().mockImplementation((id, update, options) => {
    const doc = mockDeviceData.get(id.toString());
    if (!doc) return Promise.resolve(null);
    
    // Handle dot notation update objects like {'connectionSetting.tcp.port': 503}
    const updatedDoc = { ...doc };
    
    Object.entries(update).forEach(([key, value]) => {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = updatedDoc;
        
        // Navigate down the object path
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        
        // Set the final property
        current[parts[parts.length - 1]] = value;
      } else {
        updatedDoc[key] = value;
      }
    });
    
    updatedDoc.updatedAt = new Date();
    updatedDoc.save = doc.save;
    updatedDoc.deleteOne = doc.deleteOne;
    mockDeviceData.set(id.toString(), updatedDoc);
    
    return Promise.resolve(options?.new === true ? updatedDoc : doc);
  }),
  
  deleteMany: jest.fn().mockImplementation(() => {
    mockDeviceData.clear();
    return Promise.resolve({ acknowledged: true, deletedCount: mockDeviceData.size });
  }),
};

// Profile model mock
const mockProfileModel = {
  mockStore: mockProfileData,
  
  create: jest.fn().mockImplementation(async (data) => {
    // Handle array or single document
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => mockProfileModel.create(item)));
    }
    
    // Check required fields
    if (!data.name) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    }
    
    // Create a proper mock profile document
    const doc = {
      _id: generateObjectId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Add instance methods
      save: jest.fn().mockImplementation(function() {
        this.updatedAt = new Date();
        return Promise.resolve(this);
      }),
      
      deleteOne: jest.fn().mockImplementation(function() {
        mockProfileData.delete(this._id.toString());
        return Promise.resolve({ acknowledged: true, deletedCount: 1 });
      }),
    };
    
    mockProfileData.set(doc._id.toString(), doc);
    return Promise.resolve(doc);
  }),
  
  insertMany: jest.fn().mockImplementation(async (dataArray) => {
    return Promise.all(dataArray.map(data => mockProfileModel.create(data)));
  }),
  
  find: jest.fn().mockImplementation((query = {}) => {
    // Deep query match function for nested objects (same as the device model)
    const matchesQuery = (doc, query) => {
      return Object.entries(query).every(([key, value]) => {
        // Handle nested paths
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = doc;
          
          // Navigate down the object path
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current || typeof current !== 'object') return false;
            current = current[parts[i]];
          }
          
          // Check the final property
          return current && current[parts[parts.length - 1]] === value;
        }
        
        return doc[key] === value;
      });
    };
    
    const matchingDocs = Array.from(mockProfileData.values()).filter(doc => matchesQuery(doc, query));
    return matchingDocs; // Return array directly for tests
  }),
  
  findById: jest.fn().mockImplementation((id) => {
    return Promise.resolve(mockProfileData.get(id.toString()) || null);
  }),
  
  findByIdAndUpdate: jest.fn().mockImplementation((id, update, options) => {
    const doc = mockProfileData.get(id.toString());
    if (!doc) return Promise.resolve(null);
    
    const updatedDoc = { ...doc, ...update, updatedAt: new Date() };
    mockProfileData.set(id.toString(), updatedDoc);
    
    return Promise.resolve(options?.new === true ? updatedDoc : doc);
  }),
  
  deleteMany: jest.fn().mockImplementation(() => {
    mockProfileData.clear();
    return Promise.resolve({ acknowledged: true, deletedCount: mockProfileData.size });
  }),
};

module.exports = { 
  mongoose, 
  mockUserModel, 
  mockDeviceModel, 
  mockProfileModel 
};