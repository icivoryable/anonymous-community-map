import { savePin, updatePinStatus, listPinsLast3Weeks } from "./lib/pinsKv.js";

export default async function handler(req, res) {
  try {
    const clientCode = req.headers['x-access-code'];
    const dispatcherCode = process.env.DISPATCHER_CODE;
    const observerCode = process.env.OBSERVER_CODE;

    // Determine their role based on the password they used
    let role = null;
    if (clientCode === dispatcherCode && dispatcherCode) role = "admin";
    else if (clientCode === observerCode && observerCode) role = "observer";

    if (!role) {
      return res.status(401).json({ error: "Unauthorized. Invalid access code." });
    }

    // --- GET PINS --- (Both roles can view)
    if (req.method === "GET") {
      const pins = await listPinsLast3Weeks();
      // Send the role back to the frontend so it knows which buttons to show
      return res.status(200).json({ pins, role });
    }

    // --- POST NEW PIN --- 
    if (req.method === "POST") {
      const { lat, lng, message } = req.body;
      let status = req.body.status || "Reported";

      // Security check: Observers can ONLY drop "Reported" pins. 
      // If they try to hack the request to drop a "Confirmed" pin, force it to "Reported".
      if (role === "observer") {
        status = "Reported";
      }

      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return res.status(400).json({ error: "lat/lng must be valid numbers" });
      }

      const pin = await savePin({ lat, lng, description: message, status });
      return res.status(201).json(pin);
    }

    // --- PATCH PIN STATUS --- (Admins ONLY)
    if (req.method === "PATCH") {
      if (role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Only dispatchers can update pins." });
      }

      const { id, newStatus } = req.body;
      if (!id || !newStatus) return res.status(400).json({ error: "Missing id or status" });

      const updatedPin = await updatePinStatus(id, newStatus);
      return res.status(200).json(updatedPin);
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).end();

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
