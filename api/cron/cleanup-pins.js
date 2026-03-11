// pages/api/cron/cleanup-pins.js
import { cleanupOldPins } from "../../../lib/pinsKv";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await cleanupOldPins();
  return res.status(200).json({ ok: true });
}
