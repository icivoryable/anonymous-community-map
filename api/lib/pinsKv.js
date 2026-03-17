// lib/pinsKv.js
import { kv } from "@vercel/kv";

export const RETENTION_SECONDS = 60 * 60 * 24 * 21; // 3 weeks
export const RETENTION_MS = RETENTION_SECONDS * 1000;
const MAX_DESC_LEN = 280;

function clampText(s) {
  return String(s ?? "").replace(/[\\u0000-\\u001F\\u007F]/g, "").trim().slice(0, MAX_DESC_LEN);
}

export async function savePin({ lat, lng, description = "" }) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const createdAt = Date.now();
  const pin = {
    id,
    lat: Number(lat),
    lng: Number(lng),
    description: clampText(description),
    createdAt,
  };
  await kv.set(`pin:${id}`, pin, { ex: RETENTION_SECONDS });
  await kv.zadd("pins:index", { score: createdAt, member: id });
  return pin;
}

export async function listPinsLast3Weeks() {
  const now = Date.now();
  const cutoff = now - RETENTION_MS;
  const ids = await kv.zrange("pins:index", cutoff, now, { byScore: true });
  const pins = await Promise.all(ids.map(id => kv.get(`pin:${id}`)));
  return pins.filter(Boolean);
}

export async function cleanupOldPins() {
  const cutoff = Date.now() - RETENTION_MS;
  await kv.zremrangebyscore("pins:index", "-inf", cutoff);
}