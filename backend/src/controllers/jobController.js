const jobService = require('../services/jobService');

const createJob = async (req, res, next) => {
  try {
    const { type, payload, priority, maxAttempts } = req.body;
    const job = await jobService.createJob({
      userId: req.user.id,
      type,
      payload,
      priority,
      maxAttempts
    });
    res.status(201).json({ success: true, jobId: job._id, status: job.status });
  } catch (error) {
    next(error);
  }
};

const getJobs = async (req, res, next) => {
  try {
    const result = await jobService.getJobs(req.user.id, req.user.role, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id, req.user.id, req.user.role);
    res.status(200).json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

const cancelJob = async (req, res, next) => {
  try {
    const job = await jobService.cancelJob(req.params.id, req.user.id, req.user.role);
    res.status(200).json({ success: true, message: 'Job cancelled', status: job.status });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  cancelJob
};
