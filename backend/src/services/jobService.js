const Job = require('../models/Job');
const { getIo } = require('../sockets/socketServer');

const PRIORITY_MAP = {
  CRITICAL: 40,
  HIGH: 30,
  NORMAL: 20,
  LOW: 10
};

const createJob = async ({ userId, type, payload, priority = 'NORMAL', maxAttempts }) => {
  const numericPriority = PRIORITY_MAP[priority] || 20;

  const job = new Job({
    userId,
    type,
    payload,
    priority: numericPriority,
    status: 'QUEUED',
    maxAttempts: maxAttempts !== undefined ? maxAttempts : (process.env.MAX_RETRIES || 3)
  });

  await job.save();

  // Notify frontend via Socket
  const io = getIo();
  io.emit('job:created', { jobId: job._id, type, priority, status: job.status });

  return job;
};

const getJobs = async (userId, role, query = {}) => {
  const { status, type, page = 1, limit = 10 } = query;
  
  const filter = {};
  if (role !== 'ADMIN') filter.userId = userId;
  if (status) filter.status = status;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Job.countDocuments(filter);

  return {
    jobs,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit)
  };
};

const getJobById = async (jobId, userId, role) => {
  const job = await Job.findById(jobId).populate('userId', 'email');
  if (!job) throw new Error('Job not found');

  if (role !== 'ADMIN' && job.userId._id.toString() !== userId.toString()) {
    throw new Error('Not authorized to view this job');
  }

  return job;
};

const cancelJob = async (jobId, userId, role) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error('Job not found');

  if (role !== 'ADMIN' && job.userId.toString() !== userId.toString()) {
    throw new Error('Not authorized to cancel this job');
  }

  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
    throw new Error(`Cannot cancel job in ${job.status} state`);
  }

  if (job.status === 'PROCESSING') {
    // We will implement sending a cancel message to the worker later
    // For now we just mark it as cancelling or cancelled
  }

  job.status = 'CANCELLED';
  await job.save();

  const io = getIo();
  io.emit('job:cancelled', { jobId: job._id });

  return job;
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  cancelJob
};
