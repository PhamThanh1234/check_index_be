import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import mysql from 'mysql2/promise';

interface SearchInput {
  data: string;
  'x-api-key': string;
  'mode': string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkUrl(
  url: string,
  apiKey: string,
  mode: string,
  retries = 3,
  backoff = 500
): Promise<any> {
  try {
    const query = mode === 'soft' ? `site:${url}` : `"${url}"`;
    const response = await axios.post(
      'https://google.serper.dev/search',
      { q: query },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 5000,
      }
    );

    const organic = response.data?.organic || [];
    const normalizeUrl = (u: string) => u.replace(/\/+$/, '');
    const normalizedUrl = normalizeUrl(url);

    const isIndexed = organic.some((item: any) => {
      const normalizedLink = normalizeUrl(item.link || '');
      if (mode === 'strict') {
        return normalizedLink === normalizedUrl;
      } else {
        return normalizedLink.includes(normalizedUrl) || normalizedUrl.includes(normalizedLink);
      }
    });

    return {
      url,
      indexed: isIndexed ? 'Index' : 'No Index',
      matchType: mode,
      topResult: organic[0]?.link || null
    };
  } catch (error) {
    if (retries > 0) {
      await sleep(backoff);
      return checkUrl(url, apiKey, mode, retries - 1, backoff * 2);
    }
    return {
      url,
      indexed: 'error',
      error: (error as Error).message
    };
  }
}

export const checkindexHandler = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: SearchInput }>,
  reply: FastifyReply
) => {
  const { data, mode } = request.body;

  if (!data) {
    return reply.status(400).send({ error: 'Missing required field: data' });
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'check_index',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    const [rows] = await pool.query('SELECT api_key, credit FROM check_index ORDER BY id ASC');
    let apiKeys = (rows as any[]).map(row => ({
      apiKey: row.api_key,
      credit: row.credit,
    }));

    if (apiKeys.length === 0) {
      await pool.end();
      return reply.status(500).send({ error: 'No API keys available' });
    }

    const deletedApiKeys = new Set<string>();

    const urls = data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const results: any[] = [];

    // 🏎️ Pool control: 5 concurrent tasks
    const concurrency = 5;
    let currentIndex = 0;

    async function worker() {
      while (currentIndex < urls.length) {
        const index = currentIndex++;
        const url = urls[index];

        let currentKeyIndex = apiKeys.findIndex(k => k.credit > 0 && !deletedApiKeys.has(k.apiKey));
        if (currentKeyIndex === -1) {
          throw new Error('All API keys exhausted');
        }

        const currentKey = apiKeys[currentKeyIndex];

        const result = await checkUrl(url, currentKey.apiKey, mode);
        results[index] = result; // Lưu đúng vị trí URL

        currentKey.credit -= 1;

        if (currentKey.credit <= 0 && !deletedApiKeys.has(currentKey.apiKey)) {
          try {
            await pool.query('DELETE FROM check_index WHERE api_key = ?', [currentKey.apiKey]);
            fastify.log.info(`Deleted API key with no credit: ${currentKey.apiKey}`);
            deletedApiKeys.add(currentKey.apiKey);
          } catch (error) {
            fastify.log.warn(`Error deleting API key ${currentKey.apiKey}: ${(error as Error).message}`);
          }
        } else {
          await pool.query('UPDATE check_index SET credit = ? WHERE api_key = ?', [currentKey.credit, currentKey.apiKey]);
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    await pool.end();
    return reply.send({ results });

  } catch (error) {
    fastify.log.error('Error during index checking:', error);
    await pool.end();
    return reply.status(500).send({ error: 'Internal server error during check' });
  }
};
