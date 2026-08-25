const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const { calculatePrimes } = require('./jobHandlers/cpuIntensive');
const { calculateHash } = require('./jobHandlers/fileHash');
const { processCSV } = require('./jobHandlers/csvProcessor');

// Connect to DB within worker (sometimes needed, but we rely on the main thread for updates primarily)
// Actually, to keep workers lightweight, we'll just do computation and send results back.
// DB updates will be handled by the main thread.

parentPort.on('message', async (message) => {
  if (message.type === 'START_JOB') {
    const { job } = message;
    
    try {
      let result;
      const reportProgress = (progress) => {
        parentPort.postMessage({ type: 'PROGRESS', jobId: job._id, progress });
      };

      if (job.type === 'CPU_INTENSIVE') {
        result = await calculatePrimes(job.payload.limit, reportProgress);
      } else if (job.type === 'FILE_HASH') {
        result = await calculateHash(job.payload.filePath, job.payload.algorithm, reportProgress);
      } else if (job.type === 'CSV_PROCESSING') {
        result = await processCSV(job.payload.filePath, reportProgress);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      parentPort.postMessage({ type: 'COMPLETED', jobId: job._id, result });
    } catch (error) {
      parentPort.postMessage({ type: 'FAILED', jobId: job._id, error: error.message });
    }
  }
});
