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
var HistoricalDataSchema = new mongoose_1.Schema({
    deviceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Device',
        required: [true, 'Device ID is required'],
        index: true
    },
    parameterName: {
        type: String,
        required: [true, 'Parameter name is required'],
        index: true
    },
    value: {
        type: mongoose_1.Schema.Types.Mixed,
        required: [true, 'Value is required']
    },
    unit: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    quality: {
        type: String,
        enum: ['good', 'bad', 'uncertain'],
        default: 'good'
    }
}, {
    timestamps: true
});
// Create compound indexes for efficient querying
HistoricalDataSchema.index({ deviceId: 1, parameterName: 1, timestamp: -1 });
HistoricalDataSchema.index({ timestamp: 1 });
// Virtual for retrieving device information
HistoricalDataSchema.virtual('device', {
    ref: 'Device',
    localField: 'deviceId',
    foreignField: '_id',
    justOne: true
});
// Create the model
var HistoricalData = mongoose_1.default.model('HistoricalData', HistoricalDataSchema);
exports.default = HistoricalData;
