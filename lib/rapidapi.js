export { getNearbyPlaces, geocodeAddress, getWalkingEta } from "./maps.js"

export async function distanceMatrix(originLat, originLng, destLat, destLng) {
  return await getWalkingEta(originLat, originLng, destLat, destLng)
}
