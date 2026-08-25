const Job = require('../models/Job');
const { getIo } = require('../sockets/socketServer');

class JobQueue {
  async fetchNextJob(workerId) {
    // We want to fetch a job that is QUEUED, or RETRYING
    // We sort by priority (descending) and createdAt (ascending) to get highest priority, oldest job
    const job = await Job.findOneAndUpdate(
      { 
        $or: [
          { status: 'QUEUED' },
          { status: 'RETRYING', nextRetryAt: { $lte: new Date() } }
        ]
      },
      {
        $set: {
          status: 'PROCESSING',
          workerId: workerId,
          lockedAt: new Date(),
          lockedBy: workerId,
          startedAt: new Date()
        },
        $inc: { attempts: 1 }
      },
      {
        sort: { priority: -1, createdAt: 1 },
        new: true
      }
    );

    if (job) {
      try {
        const io = getIo();
        io.emit('job:started', { 
          jobId: job._id, 
          workerId: workerId,
          status: 'PROCESSING'
        });
      } catch (err) {
        // Ignore if socket is not initialized
      }
    }

    return job;
  }

  async markJobCompleted(jobId, result) {
    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          status: 'COMPLETED',
          result,
          progress: 100,
          completedAt: new Date(),
          lockedAt: null,
          lockedBy: null
        }
      },
      { new: true }
    );

    if (job) {
      job.processingTimeMs = job.completedAt.getTime() - job.startedAt.getTime();
      await job.save();

      try {
        const io = getIo();
        io.emit('job:completed', { jobId: job._id, result, status: 'COMPLETED' });
      } catch (err) {}
    }
    return job;
  }

  async markJobFailed(jobId, errorMsg) {
    let job = await Job.findById(jobId);
    if (!job) return null;

    if (job.attempts >= job.maxAttempts) {
      job.status = 'FAILED';
      job.nextRetryAt = null;
    } else {
      job.status = 'RETRYING';
      job.nextRetryAt = new Date(Date.now() + 5000);
    }

    job.error = errorMsg;
    job.failedAt = new Date();
    job.lockedAt = null;
    job.lockedBy = null;
    
    await job.save();

    try {
      const io = getIo();
      io.emit(job.status === 'FAILED' ? 'job:failed' : 'job:retrying', { 
        jobId: job._id, 
        error: errorMsg,
        status: job.status
      });
    } catch (err) {}

    return job;
  }
}

module.exports = new JobQueue();
