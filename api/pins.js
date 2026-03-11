import { savePin, listPinsLast3Weeks } from "./lib/pinsKv.js";

import { savePin, listPinsLast3Weeks } from "./lib/pinsKv.js";

export default async function handler(req, res) {
  try {
    // 1. Check for the password in the request headers
    const clientCode = req.headers['x-access-code'];
    const serverCode = process.env.APP_ACCESS_CODE;
    
    // If they don't match (or the server code isn't set yet), block access
    if (!serverCode || clientCode !== serverCode) {
      return res.status(401).json({ error: "Unauthorized. Invalid access code." });
    }

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

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      const message = req.body?.message || "";
      const status = req.body?.status || "Reported"; // Get status from the frontend

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: "lat/lng must be valid numbers" });
      }

      // Pass the status down to the save function
      const pin = await savePin({ lat, lng, description: message, status });
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
