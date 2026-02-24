const { Redis } = require('@upstash/redis');

function statsKey(date, sport, mode) {
  return `stats:${date}:${sport}:${mode}`;
}

// Prefer Upstash (REST); fallback to Vercel Redis (bstorage_REDIS_URL or REDIS_URL) via node-redis
async function getRedis() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    return new Redis({ url: upstashUrl, token: upstashToken });
  }

  const redisUrl = process.env.bstorage_REDIS_URL || process.env.REDIS_URL;
  if (redisUrl) {
    const { createClient } = require('redis');
    const client = createClient({ url: redisUrl });
    await client.connect();
    return {
      get: async (key) => {
        const raw = await client.get(key);
        return raw ? JSON.parse(raw) : null;
      },
      set: async (key, value) => {
        await client.set(key, JSON.stringify(value));
      },
    };
  }

  throw new Error('Missing Redis config: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or bstorage_REDIS_URL / REDIS_URL');
}

module.exports = { getRedis, statsKey };
