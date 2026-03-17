import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
  try {
    const redis = Redis.fromEnv();
    await redis.set('test-key', 'hello world', { ex: 10 });
    const value = await redis.get('test-key');
    return res.status(200).json({ status: 'Redis working', value });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
