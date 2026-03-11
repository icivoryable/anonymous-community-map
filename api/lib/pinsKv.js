import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// This prevents the app from crashing during the build process if variables are missing
const redis = new Redis({
  url: redisUrl || "https://placeholder.upstash.io",
  token: redisToken || "placeholder",
});

export const RETENTION_SECONDS = 60 * 60 * 24 * 21; // 3 weeks
export const RETENTION_MS = RETENTION_SECONDS * 1000;

export async function savePin({ lat, lng, description = "" }) {
  if (!redisUrl) throw new Error("🚨 Database not connected! Missing UPSTASH_REDIS_REST_URL.");
  
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const pin = { id, lat: Number(lat), lng: Number(lng), description, createdAt };
  
  await redis.set(`pin:${id}`, JSON.stringify(pin), { ex: RETENTION_SECONDS });
  await redis.zadd("pins:index", { score: createdAt, member: id });
  
  return pin;
}

export async function listPinsLast3Weeks() {
  if (!redisUrl) return []; // Return empty map if DB isn't connected yet
  
  const now = Date.now();
  const cutoff = now - RETENTION_MS;
  
  const ids = await redis.zrange("pins:index", cutoff, now, { byScore: true });
  if (!ids || ids.length === 0) return [];

  const pins = await Promise.all(
    ids.map(id => redis.get(`pin:${id}`))
  );
  
  return pins.filter(Boolean).map(pin => typeof pin === 'string' ? JSON.parse(pin) : pin);
}
