// pages/api/pins.js
import { savePin, listPinsLast3Weeks } from "./lib/pinsKv";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat/lng must be numbers" });
    }

    const pin = await savePin({
      lat,
      lng,
      description: req.body?.message ?? ""
    });
    return res.status(201).json(pin);
  }

  if (req.method === "GET") {
    const pins = await listPinsLast3Weeks();
    return res.status(200).json(pins);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end();
}
