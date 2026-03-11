import { Redis } from "@upstash/redis";

// This automatically finds the tokens Vercel created
const redis = Redis.fromEnv();

export const RETENTION_SECONDS = 60 * 60 * 24 * 21; // 3 weeks
export const RETENTION_MS = RETENTION_SECONDS * 1000;

export async function savePin({ lat, lng, description = "" }) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const pin = { id, lat: Number(lat), lng: Number(lng), description, createdAt };
  
  // Save to Redis
  await redis.set(`pin:${id}`, JSON.stringify(pin), { ex: RETENTION_SECONDS });
  await redis.zadd("pins:index", { score: createdAt, member: id });
  
  return pin;
}

export async function listPinsLast3Weeks() {
  const now = Date.now();
  const cutoff = now - RETENTION_MS;
  
  const ids = await redis.zrange("pins:index", cutoff, now, { byScore: true });
  if (!ids || ids.length === 0) return [];

  const pins = await Promise.all(
    ids.map(id => redis.get(`pin:${id}`))
  );
  
  // Clean up any nulls and parse the JSON strings back into objects
  return pins.filter(Boolean).map(pin => typeof pin === 'string' ? JSON.parse(pin) : pin);
}
