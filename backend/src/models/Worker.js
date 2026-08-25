const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['IDLE', 'BUSY', 'OFFLINE', 'ERROR'],
    default: 'IDLE'
  },
  currentJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null
  },
  jobsProcessed: {
    type: Number,
    default: 0
  },
  successfulJobs: {
    type: Number,
    default: 0
  },
  failedJobs: {
    type: Number,
    default: 0
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Worker', workerSchema);
