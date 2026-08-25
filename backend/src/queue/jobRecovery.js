const Job = require('../models/Job');
const Worker = require('../models/Worker');
const { getIo } = require('../sockets/socketServer');

class JobRecovery {
  constructor() {
    this.intervalId = null;
  }

  start() {
    // Run recovery every 30 seconds
    this.intervalId = setInterval(() => this.recoverJobs(), 30000);
    console.log('Job recovery service started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async recoverJobs() {
    try {
      const timeoutMs = parseInt(process.env.JOB_TIMEOUT || '60000', 10);
      const timeoutDate = new Date(Date.now() - timeoutMs);

      // Find jobs that have been processing for too long
      const stuckJobs = await Job.find({
        status: 'PROCESSING',
        lockedAt: { $lt: timeoutDate }
      });

      for (let job of stuckJobs) {
        console.log(`Recovering stuck job ${job._id}`);
        
        if (job.attempts >= job.maxAttempts) {
          job.status = 'FAILED';
          job.error = 'Job timed out and exceeded max retries (Dead Letter)';
        } else {
          job.status = 'RETRYING';
          job.error = 'Job timed out, retrying';
        }

        job.lockedAt = null;
        job.lockedBy = null;
        job.failedAt = new Date();
        
        await job.save();

        try {
          const io = getIo();
          io.emit(job.status === 'FAILED' ? 'job:failed' : 'job:retrying', {
            jobId: job._id,
            error: job.error,
            status: job.status
          });
        } catch(e) {}
      }
    } catch (error) {
      console.error('Error during job recovery:', error);
    }
  }
}

module.exports = new JobRecovery();
