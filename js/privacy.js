// --- js/privacy.js ---

/**
 * Coordinate Fuzzing & Jitter
 * 
 * Step 1: Shifts the pin by up to 100 meters in a random direction (Jitter).
 * Step 2: Snaps the resulting pin to an invisible ~100m grid.
 * 
 * This ensures exact locations are scrambled, and prevents adversaries from 
 * simply "averaging" multiple pins to find a scout's location.
 */

function jitterCoordinate(lat, lng) {
  const meters = 100;
  // 1 degree of latitude is roughly 111,320 meters anywhere on Earth
  const randLat = lat + ((Math.random() - 0.5) * meters) / 111320;
  // Longitude distance shrinks as you move away from the equator, so we use cosine
  const randLng = lng + ((Math.random() - 0.5) * meters) / (111320 * Math.cos(lat * Math.PI / 180));
  
  return { lat: randLat, lng: randLng };
}

function snapToGrid(lat, lng) {
  const grid = 0.001; // Roughly a 100m x 100m invisible grid box
  
  // Rounds the coordinates so the pin "snaps" to the nearest grid intersection
  const snappedLat = Math.round(lat / grid) * grid;
  const snappedLng = Math.round(lng / grid) * grid;
  
  return { lat: snappedLat, lng: snappedLng };
}

// This is the main function called by storage.js before saving to the database
window.obfuscateLocation = function(lat, lng) {
  // First, we apply the 100m randomized shift
  const jittered = jitterCoordinate(parseFloat(lat), parseFloat(lng));
  
  // Second, we lock it to the nearest invisible grid intersection
  return snapToGrid(jittered.lat, jittered.lng);
}
