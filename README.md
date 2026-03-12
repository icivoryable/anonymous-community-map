# Anonymous Community Map (Tampa Pilot)

This is a lightweight, privacy-first community observation mapping tool designed for local situational awareness. 

**Purpose:** This tool is designed exclusively for community safety, legal rights observation, and coordinating outreach/support. It acts as an ephemeral, internal dashboard for vetted dispatchers and observers.

### Privacy-by-Design & Data Minimization
This project is built defensively to reduce risk, not extract data. It strictly adheres to the following principles:

- **No User Accounts:** No names, emails, IP logs, or profiles are required or stored.
- **Ephemeral Data:** All map data uses a strict 4-hour Time-To-Live (TTL). Once the clock expires, the data is automatically and permanently purged from the database. There is no historical archive.
- **Location Fuzzing:** Exact coordinates (door numbers, specific driveways) are never saved. The application mathematically applies a ~300-meter random offset to all coordinates before they hit the database, ensuring data only reflects general neighborhood areas.
- **No Third-Party Analytics:** No Google Analytics, no tracking cookies, and no public indexing.

### How it works
1. **Access:** The tool is not public. Access is granted via secure invite codes managed via Vercel Environment Variables.
2. **Observation:** Trusted observers can securely log neighborhood-level activity.
3. **Status Tracking:** Dispatchers can update the status of an observation (e.g., "Under Verification," "Confirmed," "Resolved").
4. **Integration:** The app is designed to bridge with secure messaging apps (Signal/WhatsApp). Dispatchers use the "Copy CLEAR Report" button to format an observation for secure text distribution. 

### Tech Stack
* Frontend: HTML/JS, Leaflet.js, OpenStreetMap Nominatim (Free Geocoder)
* Backend: Vercel Serverless Functions (Next.js API)
* Database: Upstash Redis (for ephemeral TTL storage)

*This is an early MVP built for local pilots.*
