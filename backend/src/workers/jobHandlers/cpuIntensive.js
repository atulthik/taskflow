const calculatePrimes = (limit, reportProgress) => {
  return new Promise((resolve) => {
    let primes = [];
    let isPrime = Array(limit + 1).fill(true);
    isPrime[0] = false;
    isPrime[1] = false;

    let chunkSize = Math.max(1000, Math.floor(limit / 10));
    let current = 2;

    const processChunk = () => {
      let end = Math.min(current + chunkSize, limit + 1);
      
      for (let p = current; p < end; p++) {
        if (isPrime[p]) {
          primes.push(p);
          for (let i = p * p; i <= limit; i += p) {
            isPrime[i] = false;
          }
        }
      }
      
      current = end;
      let progress = Math.floor((current / limit) * 100);
      reportProgress(progress);

      if (current <= limit) {
        // use setImmediate so we don't completely block the thread
        setImmediate(processChunk);
      } else {
        resolve({
          totalPrimes: primes.length,
          largestPrime: primes[primes.length - 1]
        });
      }
    };

    processChunk();
  });
};

module.exports = { calculatePrimes };
