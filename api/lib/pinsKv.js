import { Redis } from "@upstash/redis";

// This built-in function automatically finds the UPSTASH_REDIS_REST_URL 
// and UPSTASH_REDIS_REST_TOKEN that Vercel just created for you.
const redis = Redis.fromEnv();

export const RETENTION_SECONDS = 60 * 60 * 24 * 21; // 3 weeks
export const RETENTION_MS = RETENTION_SECONDS * 1000;
// Fuzzing function: shifts coordinates by up to ~300 meters
// This ensures exact house/door numbers are NEVER stored
function fuzzLocation(exactLat, exactLng) {
  const latOffset = (Math.random() - 0.5) * 0.003;
  const lngOffset = (Math.random() - 0.5) * 0.003;
  return { 
    lat: Number(exactLat) + latOffset, 
    lng: Number(exactLng) + lngOffset 
  };
}

export async function savePin({ lat, lng, description = "", status = "Reported" }) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  
  // Apply the fuzzing before creating the pin object
  const fuzzed = fuzzLocation(lat, lng);
  
  const pin = { 
    id, 
    lat: fuzzed.lat, 
    lng: fuzzed.lng, 
    description, 
    status, // Added status tracking
    createdAt 
  };
  
  await redis.set(`pin:${id}`, JSON.stringify(pin), { ex: RETENTION_SECONDS });
  await redis.zadd("pins:index", { score: createdAt, member: id });
  
  return pin;
}

export async function listPinsLast3Weeks() {
  const now = Date.now();
  const cutoff = now - RETENTION_MS;
  
  const ids = await redis.zrange("pins:index", cutoff, now, { byScore: true });
  if (!ids || ids.length === 0) return [];

  const pins = await Promise.all(ids.map(id => redis.get(`pin:${id}`)));
  
  return pins.filter(Boolean).map(pin => typeof pin === 'string' ? JSON.parse(pin) : pin);
}