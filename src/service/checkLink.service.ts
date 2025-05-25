import { checkUrlStatus } from '../plugins/httpClient';

// Hàm delay (tạm dừng) để đợi giữa các lần retry
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Hàm kiểm tra URL với cơ chế retry
const checkUrlWithRetry = async (url: string, retries = 2, delayMs = 1000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await checkUrlStatus(url);
    if (result.status !== 'error') return result; // Thành công
    if (attempt < retries) await delay(delayMs); // Đợi trước khi thử lại
  }
  return { url, status: 'error' }; 
};

// Hàm kiểm tra URL hàng loạt với giới hạn song song và retry
export const checkUrlsInBatch = async (
  urls: string[],
  concurrency = 10,
  maxRetries = 2,
  retryDelay = 1000
) => {
  const results: { url: string, status: number | string }[] = [];

  const executeBatch = async (batch: string[]) => {
    const batchResults = await Promise.allSettled(
      batch.map((url) => checkUrlWithRetry(url, maxRetries, retryDelay))
    );
    return batchResults.map((result, index) => ({
      url: batch[index],
      status: result.status === 'fulfilled' ? result.value.status : 'error'
    }));
  };

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await executeBatch(batch);
    results.push(...batchResults);
  }

  return results;
};
