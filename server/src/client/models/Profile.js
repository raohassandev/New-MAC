"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importStar(require("mongoose"));
var ScheduleTimeSchema = new mongoose_1.Schema({
    days: [
        { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    ],
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
});
var ScheduleSchema = new mongoose_1.Schema({
    active: { type: Boolean, default: false },
    times: [ScheduleTimeSchema],
});
var ProfileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    targetTemperature: { type: Number, required: true },
    temperatureRange: {
        type: [Number],
        required: true,
        validate: [
            function (val) { return val.length === 2; },
            'Temperature range must have exactly 2 values',
        ],
    },
    fanSpeed: { type: Number, required: true, min: 0, max: 100 },
    mode: {
        type: String,
        enum: ['cooling', 'heating', 'auto', 'dehumidify'],
        default: 'cooling',
    },
    schedule: {
        type: ScheduleSchema,
        default: function () { return ({ active: false, times: [] }); },
    },
    assignedDevices: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Device' }],
    isTemplate: { type: Boolean, default: false },
    tags: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// Update the updatedAt timestamp on save
ProfileSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next(null); // Fixed: pass null instead of undefined
});
var Profile = mongoose_1.default.model('Profile', ProfileSchema);
exports.default = Profile;
