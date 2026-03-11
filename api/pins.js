import { savePin, listPinsLast3Weeks } from "./lib/pinsKv.js";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      const message = req.body?.message || "";

      // Make sure we have valid numbers
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: "lat/lng must be valid numbers" });
      }

      const pin = await savePin({ lat, lng, description: message });
      return res.status(201).json(pin);
    }

    if (req.method === "GET") {
      const pins = await listPinsLast3Weeks();
      return res.status(200).json(pins);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
    
  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
