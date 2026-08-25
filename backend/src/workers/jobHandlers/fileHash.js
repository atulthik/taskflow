const fs = require('fs');
const crypto = require('crypto');

const calculateHash = (filePath, algorithm, reportProgress) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error('File does not exist'));
    }

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;
    let processedSize = 0;

    const hash = crypto.createHash(algorithm || 'sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => {
      hash.update(chunk);
      processedSize += chunk.length;
      const progress = Math.floor((processedSize / totalSize) * 100);
      
      // throttle progress reports
      if (progress % 10 === 0) {
        reportProgress(progress);
      }
    });

    stream.on('end', () => {
      resolve({
        algorithm: algorithm || 'sha256',
        hash: hash.digest('hex'),
        fileSize: totalSize
      });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
};

module.exports = { calculateHash };
