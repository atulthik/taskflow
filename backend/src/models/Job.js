const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'CPU_INTENSIVE', 
      'JSON_PROCESSING', 
      'CSV_PROCESSING', 
      'IMAGE_METADATA', 
      'FILE_HASH', 
      'DATA_TRANSFORM', 
      'REPORT_GENERATION'
    ]
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED'],
    default: 'QUEUED'
  },
  priority: {
    type: Number,
    // 40: CRITICAL, 30: HIGH, 20: NORMAL, 10: LOW
    default: 20
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  workerId: {
    type: String,
    default: null
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockedBy: {
    type: String,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  nextRetryAt: {
    type: Date,
    default: null
  },
  processingTimeMs: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Indexes for quick queue querying
jobSchema.index({ status: 1, priority: -1, createdAt: 1 });
jobSchema.index({ lockedAt: 1 });
jobSchema.index({ userId: 1 });
jobSchema.index({ workerId: 1 });

module.exports = mongoose.model('Job', jobSchema);
