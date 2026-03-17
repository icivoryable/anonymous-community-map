function jitterCoordinate(lat, lng){

const meters = 100
const randLat = lat + ((Math.random() - 0.5) * meters) / 111320
const randLng = lng + ((Math.random() - 0.5) * meters) / (111320 * Math.cos(lat * Math.PI/180))

return {lat: randLat, lng: randLng}

}

function snapToGrid(lat, lng){

const grid = 0.001   // roughly 100m

const snappedLat = Math.round(lat / grid) * grid
const snappedLng = Math.round(lng / grid) * grid

return {lat: snappedLat, lng: snappedLng}

}

function obfuscateLocation(lat,lng){

const jittered = jitterCoordinate(lat,lng)

return snapToGrid(jittered.lat,jittered.lng)

}