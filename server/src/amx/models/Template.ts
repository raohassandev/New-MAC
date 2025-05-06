// import mongoose from 'mongoose';

// // Create a separate template schema without using the DeviceSchema.obj
// const DeviceDriverSchema = new mongoose.Schema({
//   // Base device fields
//   name: { type: String, required: true },
//   make: { type: String },
//   model: { type: String },
//   description: { type: String },
//   enabled: { type: Boolean, default: true },
//   tags: [{ type: String }],

//   // Connection settings
//   connectionSetting: {
//     type: mongoose.Schema.Types.Mixed,
//     required: false
//   },

//   // Data points
//   dataPoints: [{
//     type: mongoose.Schema.Types.Mixed
//   }],

//   // Template-specific fields
//   deviceType: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   isTemplate: {
//     type: Boolean,
//     default: true,
//   },
//   isVerified: {
//     type: Boolean,
//     default: false,
//   },
//   visibility: {
//     type: String,
//     enum: ['public', 'private', 'organization'],
//     default: 'private',
//   },
//   createdBy: {
//     userId: {
//       type: String,
//       required: true,
//     },
//     username: {
//       type: String,
//       required: true,
//     },
//     email: {
//       type: String,
//       required: true,
//     },
//     organization: {
//       type: String,
//       default: '',
//     },
//   },
//   usageCount: {
//     type: Number,
//     default: 0,
//   },
//   rating: {
//     average: {
//       type: Number,
//       default: 0,
//     },
//     count: {
//       type: Number,
//       default: 0,
//     },
//   },
// }, { timestamps: true });

// // Create a compound index to ensure unique templates per device type
// DeviceDriverSchema.index({ name: 1, deviceType: 1 }, { unique: true });

// // Export the schema for use elsewhere
// export { DeviceDriverSchema };
