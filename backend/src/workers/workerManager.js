const { Worker } = require('worker_threads');
const path = require('path');
const WorkerModel = require('../models/Worker');
const jobQueue = require('../queue/jobQueue');

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.isShuttingDown = false;
    this.workerCount = parseInt(process.env.WORKER_COUNT || '4', 10);
  }

  async init() {
    console.log(`Initializing Worker Manager with ${this.workerCount} workers...`);
    
    // Clear out any old worker states in the DB
    await WorkerModel.deleteMany({});
    
    for (let i = 0; i < this.workerCount; i++) {
      this.spawnWorker(`worker-${i + 1}`);
    }

    // Start fetching jobs periodically
    this.fetchInterval = setInterval(() => this.pollJobs(), 2000);
  }

  async spawnWorker(workerId) {
    const workerModel = new WorkerModel({ workerId, status: 'IDLE' });
    await workerModel.save();

    const workerPath = path.join(__dirname, 'worker.js');
    const worker = new Worker(workerPath, { workerData: { workerId } });

    worker.on('message', async (message) => {
      await this.handleWorkerMessage(workerId, worker, message);
    });

    worker.on('error', async (error) => {
      console.error(`Worker ${workerId} error:`, error);
      await this.handleWorkerCrash(workerId);
    });

    worker.on('exit', async (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        console.error(`Worker ${workerId} stopped with exit code ${code}`);
        await this.handleWorkerCrash(workerId);
      }
    });

    this.workers.set(workerId, {
      thread: worker,
      dbModel: workerModel,
      currentJobId: null
    });
  }

  async handleWorkerMessage(workerId, worker, message) {
    const workerState = this.workers.get(workerId);
    
    if (message.type === 'PROGRESS') {
      // We could update job progress in DB or send via socket
      // For performance, we might just emit via socket and only save 100% to DB
    } else if (message.type === 'COMPLETED') {
      await jobQueue.markJobCompleted(message.jobId, message.result);
      await this.markWorkerIdle(workerId, true);
    } else if (message.type === 'FAILED') {
      await jobQueue.markJobFailed(message.jobId, message.error);
      await this.markWorkerIdle(workerId, false);
    }
  }

  async handleWorkerCrash(workerId) {
    const workerState = this.workers.get(workerId);
    if (workerState && workerState.currentJobId) {
      await jobQueue.markJobFailed(workerState.currentJobId, 'Worker crashed unexpectedly');
    }
    
    this.workers.delete(workerId);
    await WorkerModel.deleteOne({ workerId });

    if (!this.isShuttingDown) {
      console.log(`Respawning worker ${workerId}...`);
      this.spawnWorker(workerId);
    }
  }

  async markWorkerIdle(workerId, success = true) {
    const workerState = this.workers.get(workerId);
    if (workerState) {
      workerState.currentJobId = null;
      workerState.dbModel.status = 'IDLE';
      workerState.dbModel.currentJobId = null;
      workerState.dbModel.jobsProcessed += 1;
      if (success) {
        workerState.dbModel.successfulJobs += 1;
      } else {
        workerState.dbModel.failedJobs += 1;
      }
      await workerState.dbModel.save();
    }
  }

  async pollJobs() {
    if (this.isShuttingDown) return;

    for (const [workerId, workerState] of this.workers.entries()) {
      if (workerState.dbModel.status === 'IDLE') {
        const job = await jobQueue.fetchNextJob(workerId);
        if (job) {
          workerState.dbModel.status = 'BUSY';
          workerState.dbModel.currentJobId = job._id;
          workerState.currentJobId = job._id;
          await workerState.dbModel.save();

          workerState.thread.postMessage({ type: 'START_JOB', job });
        }
      }
    }
  }

  async shutdown() {
    this.isShuttingDown = true;
    console.log('Shutting down Worker Manager...');
    clearInterval(this.fetchInterval);
    
    const terminatePromises = [];
    for (const [workerId, workerState] of this.workers.entries()) {
      if (workerState.currentJobId) {
        console.log(`Waiting for worker ${workerId} to finish job...`);
        // Ideally we wait, but for quick shutdown we just terminate
        terminatePromises.push(workerState.thread.terminate());
      } else {
        terminatePromises.push(workerState.thread.terminate());
      }
    }
    
    await Promise.all(terminatePromises);
    await WorkerModel.deleteMany({});
  }
}

module.exports = new WorkerManager();
