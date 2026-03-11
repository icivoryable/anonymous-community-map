import { savePin, listPinsLast3Weeks } from "./lib/pinsKv.js";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { lat, lng, message } = req.body;
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
    // This will print the actual error in your Vercel logs so we can debug it
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
