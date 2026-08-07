/**
 * DWIP Enterprise Integration Gateway - RetryManager
 * Exponential Backoff Policy with Jitter
 */

export class RetryManager {
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (err) {
        attempt++;
        if (attempt > maxRetries) {
          throw err;
        }

        // Exponential backoff delay with random jitter
        const backoff = baseDelayMs * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 200);
        const delay = backoff + jitter;

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
