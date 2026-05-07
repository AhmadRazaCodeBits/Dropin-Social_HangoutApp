const VIBE_GRAPH = {
  drinks:  { drinks: 100, food: 70, chill: 60, coffee: 40, walk: 20 },
  coffee:  { coffee: 100, chill: 75, food: 65, drinks: 40, walk: 50 },
  food:    { food: 100, drinks: 70, coffee: 65, chill: 60, walk: 30 },
  chill:   { chill: 100, coffee: 75, drinks: 60, food: 60, walk: 65 },
  walk:    { walk: 100, chill: 65, coffee: 50, food: 30, drinks: 20 },
  anything:{ drinks: 85, coffee: 85, food: 85, chill: 85, walk: 85 },
}

/**
 * Calculates the compatibility score (0-100) between two vibes.
 * @param {string} myVibe 
 * @param {string} theirVibe 
 * @returns {number}
 */
export function vibeMatchScore(myVibe, theirVibe) {
  if (!myVibe || !theirVibe) return 30
  const myClean = myVibe.toLowerCase()
  const theirClean = theirVibe.toLowerCase()
  
  if (myClean === 'anything') return 85
  if (theirClean === 'anything') return 85
  
  return VIBE_GRAPH[myClean]?.[theirClean] ?? 30
}
