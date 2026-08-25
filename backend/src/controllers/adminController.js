const Job = require('../models/Job');
const Worker = require('../models/Worker');
const jobQueue = require('../queue/jobQueue');

const getStats = async (req, res, next) => {
  try {
    const totalJobs = await Job.countDocuments();
    const queuedJobs = await Job.countDocuments({ status: 'QUEUED' });
    const processingJobs = await Job.countDocuments({ status: 'PROCESSING' });
    const completedJobs = await Job.countDocuments({ status: 'COMPLETED' });
    const failedJobs = await Job.countDocuments({ status: 'FAILED' });
    const retryingJobs = await Job.countDocuments({ status: 'RETRYING' });
    const activeWorkers = await Worker.countDocuments({ status: { $ne: 'OFFLINE' } });

    // Job success rate
    const successRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalJobs,
        queuedJobs,
        processingJobs,
        completedJobs,
        failedJobs,
        retryingJobs,
        activeWorkers,
        successRate
      }
    });
  } catch (error) {
    next(error);
  }
};

const getWorkers = async (req, res, next) => {
  try {
    const workers = await Worker.find().populate('currentJobId', 'type status priority');
    res.status(200).json({ success: true, workers });
  } catch (error) {
    next(error);
  }
};

const getDeadLetterJobs = async (req, res, next) => {
  try {
    const deadLetterJobs = await Job.find({ status: 'FAILED' })
      .populate('userId', 'email')
      .sort({ failedAt: -1 });
    res.status(200).json({ success: true, deadLetterJobs });
  } catch (error) {
    next(error);
  }
};

const retryDeadLetterJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || job.status !== 'FAILED') {
      return res.status(400).json({ success: false, message: 'Invalid job or not in failed state' });
    }

    job.status = 'QUEUED';
    job.attempts = 0; // Reset attempts to give it a fresh start
    job.error = null;
    job.failedAt = null;
    await job.save();

    res.status(200).json({ success: true, message: 'Job re-queued successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getWorkers,
  getDeadLetterJobs,
  retryDeadLetterJob
};
