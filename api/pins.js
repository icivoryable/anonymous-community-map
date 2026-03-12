import { savePin, listPinsLast3Weeks } from "./lib/pinsKv.js";

export default async function handler(req, res) {
  try {
    // 1. Password Check
    const clientCode = req.headers['x-access-code'];
    const serverCode = process.env.APP_ACCESS_CODE;
    
    if (!serverCode || clientCode !== serverCode) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 2. Handle dropping a new pin
    if (req.method === "POST") {
      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      const message = req.body?.message || "";
      const status = req.body?.status || "Reported";

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: "lat/lng must be valid numbers" });
      }

      const pin = await savePin({ lat, lng, description: message, status });
      return res.status(201).json(pin);
    }

    // 3. Handle loading the map
    if (req.method === "GET") {
      const pins = await listPinsLast3Weeks();
      return res.status(200).json(pins);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
    
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
