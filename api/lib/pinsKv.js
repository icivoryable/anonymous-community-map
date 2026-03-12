import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Lowered TTL to 4 hours (14400 seconds) for operational security
export const RETENTION_SECONDS = 14400; 
export const RETENTION_MS = RETENTION_SECONDS * 1000;

// Fuzzing function: shifts coordinates by up to ~300 meters
function fuzzLocation(exactLat, exactLng) {
  const latOffset = (Math.random() - 0.5) * 0.003;
  const lngOffset = (Math.random() - 0.5) * 0.003;
  return { 
    lat: Number(exactLat) + latOffset, 
    lng: Number(exactLng) + lngOffset 
  };
}

// Ensure there is only ONE savePin function in this file
export async function savePin({ lat, lng, description = "", status = "Reported" }) {
  // Safe ID generator that won't crash on older Node versions
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const createdAt = Date.now();
  
  const fuzzed = fuzzLocation(lat, lng);
  
  const pin = { 
    id, 
    lat: fuzzed.lat, 
    lng: fuzzed.lng, 
    description, 
    status, 
    createdAt 
  };
  
  await redis.set(`pin:${id}`, JSON.stringify(pin), { ex: RETENTION_SECONDS });
  await redis.zadd("pins:index", { score: createdAt, member: id });
  
  return pin;
}

// Ensure there is only ONE listPinsLast3Weeks function in this file
export async function listPinsLast3Weeks() {
  const now = Date.now();
  const cutoff = now - RETENTION_MS;
  
  const ids = await redis.zrange("pins:index", cutoff, now, { byScore: true });
  if (!ids || ids.length === 0) return [];

  const pins = await Promise.all(ids.map(id => redis.get(`pin:${id}`)));
  
  return pins.filter(Boolean).map(pin => typeof pin === 'string' ? JSON.parse(pin) : pin);
}

// Add this at the bottom of api/lib/pinsKv.js
export async function updatePinStatus(id, newStatus) {
  const pinString = await redis.get(`pin:${id}`);
  if (!pinString) throw new Error("Pin not found or expired.");
  
  // Parse the existing pin, change the status, and save it back
  const pin = typeof pinString === 'string' ? JSON.parse(pinString) : pinString;
  pin.status = newStatus;
  
  // We re-save it, but we use "KEEPTTL" so we don't accidentally reset its 4-hour countdown
  await redis.set(`pin:${id}`, JSON.stringify(pin), { keepttl: true });
  
  return pin;
}
